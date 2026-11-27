import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.utils.object_storage import (
    build_finalized_object_key,
    is_storage_uri,
    make_storage_uri,
    upload_finalized_file,
)


def _ensure_pdf_stubs() -> None:
    if "pymupdf4llm" not in sys.modules:
        sys.modules["pymupdf4llm"] = types.ModuleType("pymupdf4llm")


_ensure_pdf_stubs()


class TestFinalizedStorageKeys(unittest.TestCase):
    def test_build_finalized_object_key(self) -> None:
        key = build_finalized_object_key(12, "Guía Adaptada.pdf")
        self.assertTrue(key.startswith("finalized/12/"))
        self.assertTrue(key.endswith(".pdf"))
        self.assertNotIn(" ", key)

    def test_storage_uri_roundtrip(self) -> None:
        uri = make_storage_uri("finalized/3/doc.pdf")
        self.assertTrue(is_storage_uri(uri))
        self.assertEqual(uri, "storage://finalized/3/doc.pdf")


class TestUploadFinalizedFile(unittest.TestCase):
    @patch("app.utils.object_storage._client")
    @patch("app.utils.object_storage.ensure_bucket")
    @patch(
        "app.utils.object_storage.material_storage_enabled",
        return_value=True,
    )
    def test_upload_returns_storage_uri(
        self,
        _enabled: MagicMock,
        _ensure: MagicMock,
        client_factory: MagicMock,
    ) -> None:
        storage = MagicMock()
        client_factory.return_value.storage.from_.return_value = storage

        with tempfile.TemporaryDirectory() as tmp:
            cache_root = Path(tmp) / "cache_root"
            cache_root.mkdir()
            local = Path(tmp) / "out.pdf"
            local.write_bytes(b"%PDF-1.4")
            with patch(
                "app.utils.object_storage.STORAGE_DIR",
                cache_root,
            ):
                uri = upload_finalized_file(
                    local_path=local,
                    material_id=9,
                    filename="tema_final_abcd1234.pdf",
                )

        self.assertEqual(
            uri,
            "storage://finalized/9/tema_final_abcd1234.pdf",
        )
        storage.upload.assert_called_once()
        uploaded_path = storage.upload.call_args.kwargs["path"]
        self.assertEqual(uploaded_path, "finalized/9/tema_final_abcd1234.pdf")


class TestFinalizeStorageCleanup(unittest.TestCase):
    def _run_finalize(
        self,
        *,
        tmp: str,
        upload_side_effect=None,
        commit_side_effect=None,
    ):
        from app.services import finalization_service as service

        db = MagicMock()
        if commit_side_effect is not None:
            db.commit.side_effect = commit_side_effect

        material = MagicMock()
        material.name = "tema.pdf"
        material.file_path = "/tmp/tema.pdf"
        analysis = MagicMock()
        analysis.id = 1

        def fake_write_adapted_pdf(**_kwargs):
            output_path = str(Path(tmp) / "tema_final_abcd1234.pdf")
            Path(output_path).write_bytes(b"%PDF-1.4")
            return output_path, "tema_final_abcd1234.pdf", []

        storage_uri = "storage://finalized/3/tema_final_abcd1234.pdf"
        upload = MagicMock(
            side_effect=upload_side_effect or (lambda **_kwargs: storage_uri),
        )

        with (
            patch.object(
                service.material_repository,
                "get_by_id",
                return_value=material,
            ),
            patch.object(
                service.finalization_repository,
                "get_latest_completed_analysis",
                return_value=analysis,
            ),
            patch.object(
                service.finalization_repository,
                "get_barriers_by_analysis",
                return_value=[],
            ),
            patch.object(
                service.finalization_repository,
                "get_proposals_by_barriers",
                return_value=[],
            ),
            patch.object(
                service,
                "resolve_analyzed_pdf_path",
                return_value=Path("/tmp/tema.pdf"),
            ),
            patch.object(service, "extract_document", return_value={"pages": []}),
            patch.object(service, "extract_document_title", return_value="Tema"),
            patch.object(
                service,
                "_apply_adaptations",
                return_value=({"pages": []}, {}),
            ),
            patch.object(
                service,
                "_write_adapted_pdf",
                side_effect=fake_write_adapted_pdf,
            ),
            patch.object(service, "material_storage_enabled", return_value=True),
            patch.object(service, "upload_finalized_file", upload),
            patch.object(
                service.finalization_repository,
                "create_finalized_document",
                return_value=MagicMock(),
            ),
            patch.object(service, "delete_stored_file") as delete_stored,
            patch.dict("os.environ", {"FINALIZED_DIR": tmp}, clear=False),
        ):
            try:
                result = service.finalize_material(db=db, material_id=3)
            except Exception as exc:
                return {
                    "error": exc,
                    "delete_stored": delete_stored,
                    "local_output_dir": Path(tmp),
                    "upload": upload,
                }
            return {
                "result": result,
                "delete_stored": delete_stored,
                "local_output_dir": Path(tmp),
                "upload": upload,
            }

    def test_success_removes_local_copy_after_storage_upload(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            outcome = self._run_finalize(tmp=tmp)
            leftovers = list(Path(tmp).glob("*.pdf"))
            self.assertIn("result", outcome)
            self.assertEqual(leftovers, [])
            outcome["delete_stored"].assert_not_called()

    def test_commit_failure_removes_storage_object_and_local(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            outcome = self._run_finalize(
                tmp=tmp,
                commit_side_effect=RuntimeError("db down"),
            )
            leftovers = list(Path(tmp).glob("*.pdf"))
            self.assertIsInstance(outcome["error"], RuntimeError)
            self.assertEqual(leftovers, [])
            outcome["delete_stored"].assert_called_once_with(
                "storage://finalized/3/tema_final_abcd1234.pdf",
            )


if __name__ == "__main__":
    unittest.main()
