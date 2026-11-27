import sys
import types
import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException


def _ensure_pdf_stubs() -> None:
    if "pymupdf4llm" not in sys.modules:
        sys.modules["pymupdf4llm"] = types.ModuleType("pymupdf4llm")


_ensure_pdf_stubs()


class TestDeleteMaterial(unittest.TestCase):
    def test_delete_material_not_found(self) -> None:
        from app.services.material_service import delete_material

        db = MagicMock()
        with patch(
            "app.services.material_service.material_repository.get_by_id",
            return_value=None,
        ):
            with self.assertRaises(HTTPException) as ctx:
                delete_material(db=db, material_id=99)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_delete_material_only_soft_deletes(self) -> None:
        from app.services.material_service import delete_material

        db = MagicMock()
        material = MagicMock()
        material.id = 5
        material.file_path = "storage://materials/abc/doc.pdf"
        call_order: list[str] = []

        with (
            patch(
                "app.services.material_service.material_repository.get_by_id",
                return_value=material,
            ),
            patch(
                "app.services.finalization_service.soft_delete_finalized_documents_for_material",
                side_effect=lambda **_kwargs: call_order.append("finalized"),
            ) as soft_finalized,
            patch(
                "app.utils.object_storage.delete_stored_file",
            ) as delete_file,
            patch(
                "app.services.material_service.material_repository.soft_delete",
                side_effect=lambda **_kwargs: call_order.append("soft_delete"),
            ) as soft_delete,
        ):
            delete_material(db=db, material_id=5)
            soft_finalized.assert_called_once_with(db=db, material_id=5)
            soft_delete.assert_called_once_with(
                db=db,
                material=material,
                commit=False,
            )
            db.commit.assert_called_once()
            delete_file.assert_not_called()
            self.assertEqual(call_order, ["finalized", "soft_delete"])


class TestDeleteFinalizedDocument(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        _ensure_pdf_stubs()

    def test_delete_finalized_missing(self) -> None:
        from app.services.finalization_service import delete_finalized_document

        db = MagicMock()
        with patch(
            "app.services.finalization_service.finalization_repository.get_finalized_document_by_id",
            return_value=None,
        ):
            with self.assertRaises(LookupError):
                delete_finalized_document(
                    db=db,
                    material_id=1,
                    document_id=2,
                )

    def test_delete_finalized_soft_deletes_without_storage(self) -> None:
        from app.services.finalization_service import delete_finalized_document

        db = MagicMock()
        document = MagicMock()
        document.file_path = "storage://finalized/1/out.pdf"

        with (
            patch(
                "app.services.finalization_service.finalization_repository.get_finalized_document_by_id",
                return_value=document,
            ),
            patch(
                "app.services.finalization_service.delete_stored_file",
            ) as delete_file,
            patch(
                "app.services.finalization_service.finalization_repository.soft_delete_finalized_document",
            ) as soft_delete,
        ):
            delete_finalized_document(
                db=db,
                material_id=1,
                document_id=2,
            )
            soft_delete.assert_called_once_with(db=db, document=document)
            delete_file.assert_not_called()

    def test_soft_delete_finalized_documents_for_material(self) -> None:
        from app.services.finalization_service import (
            soft_delete_finalized_documents_for_material,
        )

        db = MagicMock()

        with (
            patch(
                "app.services.finalization_service.finalization_repository.soft_delete_available_for_material",
                return_value=2,
            ) as soft_delete,
            patch(
                "app.services.finalization_service.delete_stored_file",
            ) as delete_file,
        ):
            deleted = soft_delete_finalized_documents_for_material(
                db=db,
                material_id=5,
            )

        soft_delete.assert_called_once_with(db=db, material_id=5)
        self.assertEqual(deleted, 2)
        delete_file.assert_not_called()

    def test_downloadable_queries_require_active_material(self) -> None:
        from app.repositories import finalization_repository
        from app.repositories.finalization_repository import (
            FINALIZED_STATUS_AVAILABLE,
        )
        from app.repositories.material_repository import (
            MATERIAL_STATUS_UPLOADED,
        )

        db = MagicMock()
        db.scalar.return_value = None

        finalization_repository.get_downloadable_finalized_document(
            db=db,
            material_id=1,
            document_id=2,
        )
        finalization_repository.get_latest_downloadable_finalized_document(
            db=db,
            material_id=1,
        )

        self.assertEqual(db.scalar.call_count, 2)
        for call in db.scalar.call_args_list:
            compiled = str(
                call.args[0].compile(compile_kwargs={"literal_binds": True})
            )
            self.assertIn(MATERIAL_STATUS_UPLOADED, compiled)
            self.assertIn(FINALIZED_STATUS_AVAILABLE, compiled)
            self.assertIn("JOIN", compiled.upper())

    def test_finalize_aborts_when_material_deleted_before_persist(self) -> None:
        from app.services.finalization_service import finalize_material

        db = MagicMock()
        material = MagicMock()
        material.id = 7
        material.name = "tema.pdf"
        material.file_path = "storage://materials/h/tema.pdf"
        analysis = MagicMock()
        analysis.id = 1

        with (
            patch(
                "app.services.finalization_service.material_repository.get_by_id",
                side_effect=[material, None],
            ),
            patch(
                "app.services.finalization_service.finalization_repository.get_latest_completed_analysis",
                return_value=analysis,
            ),
            patch(
                "app.services.finalization_service.finalization_repository.get_barriers_by_analysis",
                return_value=[],
            ),
            patch(
                "app.services.finalization_service.finalization_repository.get_proposals_by_barriers",
                return_value=[],
            ),
            patch(
                "app.services.finalization_service.resolve_material_path",
                return_value=MagicMock(),
            ),
            patch(
                "app.services.finalization_service.extract_document",
                return_value={"pages": []},
            ),
            patch(
                "app.services.finalization_service.extract_document_title",
                return_value="Tema",
            ),
            patch(
                "app.services.finalization_service.generate_pdf",
            ),
            patch(
                "app.services.finalization_service.material_storage_enabled",
                return_value=False,
            ),
            patch(
                "app.services.finalization_service.finalization_repository.create_finalized_document",
            ) as create_doc,
            patch(
                "app.services.finalization_service.os.makedirs",
            ),
            patch(
                "app.services.finalization_service.os.path.isfile",
                return_value=True,
            ),
            patch(
                "app.services.finalization_service.os.remove",
            ) as remove_file,
        ):
            with self.assertRaises(LookupError):
                finalize_material(db=db, material_id=7)

        create_doc.assert_not_called()
        remove_file.assert_called()


class TestDeleteStorageHelper(unittest.TestCase):
    @patch("app.utils.object_storage._client")
    @patch("app.utils.object_storage.ensure_bucket")
    @patch(
        "app.utils.object_storage.material_storage_enabled",
        return_value=True,
    )
    def test_delete_storage_object_calls_remove(
        self,
        _enabled: MagicMock,
        _ensure: MagicMock,
        client_factory: MagicMock,
    ) -> None:
        from app.utils.object_storage import delete_storage_object

        storage = MagicMock()
        client_factory.return_value.storage.from_.return_value = storage
        delete_storage_object("storage://finalized/3/a.pdf")
        storage.remove.assert_called_once_with(["finalized/3/a.pdf"])


if __name__ == "__main__":
    unittest.main()
