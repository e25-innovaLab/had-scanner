import sys
import types
import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch


def _ensure_pdf_stubs() -> None:
    if "pymupdf4llm" not in sys.modules:
        sys.modules["pymupdf4llm"] = types.ModuleType("pymupdf4llm")


_ensure_pdf_stubs()


class TestFinalizedRetention(unittest.TestCase):
    def test_cleanup_disabled_when_days_zero(self) -> None:
        from app.services.finalization_service import (
            cleanup_expired_finalized_documents,
        )

        db = MagicMock()
        with patch(
            "app.services.finalization_service.finalization_repository.get_finalized_documents_older_than",
        ) as older_than:
            deleted = cleanup_expired_finalized_documents(
                db=db,
                retention_days=0,
            )
        self.assertEqual(deleted, 0)
        older_than.assert_not_called()

    def test_cleanup_deletes_expired_rows_and_files(self) -> None:
        from app.services.finalization_service import (
            cleanup_expired_finalized_documents,
        )

        db = MagicMock()
        doc = MagicMock()
        doc.id = 11
        doc.file_path = "storage://finalized/1/old.pdf"

        with (
            patch(
                "app.services.finalization_service.finalization_repository.get_finalized_documents_older_than",
                return_value=[doc],
            ) as older_than,
            patch(
                "app.services.finalization_service.finalization_repository.delete_finalized_document",
            ) as delete_row,
            patch(
                "app.services.finalization_service.delete_stored_file",
            ) as delete_file,
        ):
            deleted = cleanup_expired_finalized_documents(
                db=db,
                retention_days=7,
                now=datetime(2026, 11, 25, tzinfo=timezone.utc),
            )

        self.assertEqual(deleted, 1)
        older_than.assert_called_once()
        cutoff = older_than.call_args.kwargs["cutoff"]
        self.assertEqual(cutoff.day, 18)
        delete_row.assert_called_once_with(db=db, document=doc)
        delete_file.assert_called_once_with("storage://finalized/1/old.pdf")


if __name__ == "__main__":
    unittest.main()
