import unittest
from unittest.mock import patch

from app.services.document_classifier import (
    classify_document,
    count_extractable_chars,
    is_text_poor,
    needs_ocr,
    text_poor_page_numbers,
)


def _document_with_chars(chars_by_page: list[int]) -> dict:
    pages = []
    for index, chars in enumerate(chars_by_page, start=1):
        text = "x" * chars
        pages.append(
            {
                "page_number": index,
                "elements": [
                    {"type": "text", "text": text},
                ]
                if chars
                else [],
            }
        )
    return {
        "page_count": len(pages),
        "pages": pages,
    }


class TestDocumentClassifier(unittest.TestCase):
    def test_count_extractable_chars(self):
        document = _document_with_chars([10, 0, 5])
        self.assertEqual(count_extractable_chars(document), 15)

    def test_classify_text_poor_when_sparse(self):
        with patch(
            "app.services.document_classifier.OCR_MIN_CHARS_PER_PAGE",
            40,
        ):
            with patch(
                "app.services.document_classifier.OCR_MIN_TOTAL_CHARS",
                120,
            ):
                document = _document_with_chars([5, 5, 5])
                self.assertTrue(is_text_poor(document))
                self.assertEqual(classify_document(document), "text_poor")

    def test_classify_text_rich_when_dense(self):
        with patch(
            "app.services.document_classifier.OCR_MIN_CHARS_PER_PAGE",
            40,
        ):
            with patch(
                "app.services.document_classifier.OCR_MIN_TOTAL_CHARS",
                120,
            ):
                document = _document_with_chars([200, 200, 200])
                self.assertEqual(classify_document(document), "text_rich")
                self.assertFalse(needs_ocr(document))

    def test_hybrid_doc_needs_ocr_for_sparse_page(self):
        with patch(
            "app.services.document_classifier.OCR_MIN_CHARS_PER_PAGE",
            40,
        ):
            with patch(
                "app.services.document_classifier.OCR_MIN_TOTAL_CHARS",
                120,
            ):
                document = _document_with_chars([200, 5, 200])
                self.assertFalse(is_text_poor(document))
                self.assertEqual(text_poor_page_numbers(document), [2])
                self.assertTrue(needs_ocr(document))


if __name__ == "__main__":
    unittest.main()
