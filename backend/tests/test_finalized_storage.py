import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.utils.object_storage import (
    build_finalized_object_key,
    is_storage_uri,
    make_storage_uri,
    upload_finalized_file,
)


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


if __name__ == "__main__":
    unittest.main()
