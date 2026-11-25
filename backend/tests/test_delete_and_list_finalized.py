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

    def test_delete_material_soft_deletes_and_clears_files(self) -> None:
        from app.services.material_service import delete_material

        db = MagicMock()
        material = MagicMock()
        material.id = 5
        material.file_path = "storage://materials/abc/doc.pdf"
        finalized = MagicMock()
        finalized.file_path = "storage://finalized/5/out.pdf"

        with (
            patch(
                "app.services.material_service.material_repository.get_by_id",
                return_value=material,
            ),
            patch(
                "app.repositories.finalization_repository.get_finalized_documents_by_material",
                return_value=[finalized],
            ),
            patch(
                "app.repositories.finalization_repository.delete_finalized_document",
            ) as delete_finalized_row,
            patch(
                "app.services.material_service.material_repository.soft_delete",
            ) as soft_delete,
            patch(
                "app.utils.object_storage.delete_stored_file",
            ) as delete_file,
        ):
            delete_material(db=db, material_id=5)
            delete_finalized_row.assert_called_once()
            soft_delete.assert_called_once_with(db=db, material=material)
            self.assertEqual(
                [call.args[0] for call in delete_file.call_args_list],
                [
                    "storage://finalized/5/out.pdf",
                    "storage://materials/abc/doc.pdf",
                ],
            )


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

    def test_delete_finalized_removes_row_and_file(self) -> None:
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
                "app.services.finalization_service.finalization_repository.delete_finalized_document",
            ) as delete_row,
            patch(
                "app.services.finalization_service.delete_stored_file",
            ) as delete_file,
        ):
            delete_finalized_document(
                db=db,
                material_id=1,
                document_id=2,
            )
            delete_row.assert_called_once_with(db=db, document=document)
            delete_file.assert_called_once_with(
                "storage://finalized/1/out.pdf",
            )


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
