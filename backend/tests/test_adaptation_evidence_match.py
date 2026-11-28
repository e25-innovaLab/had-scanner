import unittest
from types import SimpleNamespace

from app.services.evidence_matcher import find_evidence_element


class TestAdaptationEvidenceMatch(unittest.TestCase):
    def test_finds_by_fuzzy_anchor_when_element_id_drifted(self):
        evidence = SimpleNamespace(
            element_id="p2-e99",
            page=2,
            anchor="La consigna pide cinco pasos juntos.",
            element_type="text",
        )
        elements_by_id = {
            "p2-e3": {
                "element_id": "p2-e3",
                "type": "text",
                "text": "La consigna pide cinco pasos juntos.",
            }
        }
        elements_by_page = {
            2: [elements_by_id["p2-e3"]],
        }
        match = find_evidence_element(
            evidence,
            elements_by_id,
            elements_by_page,
        )
        self.assertIsNotNone(match)
        self.assertEqual(match["element_id"], "p2-e3")

    def test_finds_on_neighbor_page(self):
        evidence = SimpleNamespace(
            element_id=None,
            page=3,
            anchor="Leé el texto y respondé",
            element_type="text",
        )
        elements_by_page = {
            2: [
                {
                    "element_id": "p2-e1",
                    "type": "text",
                    "text": "Leé el texto y respondé las preguntas.",
                }
            ],
            3: [],
        }
        match = find_evidence_element(
            evidence,
            {},
            elements_by_page,
        )
        self.assertIsNotNone(match)
        self.assertEqual(match["element_id"], "p2-e1")

    def test_extract_falls_back_to_anchor(self):
        try:
            from app.services.adaptation_service import (
                _extract_original_content,
            )
        except ModuleNotFoundError as exc:
            self.skipTest(f"FastAPI unavailable: {exc}")

        barrier = SimpleNamespace(
            id=5,
            evidences=[
                SimpleNamespace(
                    element_id="p1-e50",
                    page=1,
                    anchor="Texto ancla de Gemini",
                    element_type="text",
                )
            ],
        )
        document = {
            "pages": [
                {
                    "page_number": 1,
                    "elements": [
                        {
                            "element_id": "p1-e1",
                            "type": "text",
                            "text": "Otro texto distinto",
                        }
                    ],
                }
            ]
        }
        content = _extract_original_content(document, barrier)
        self.assertEqual(content, "Texto ancla de Gemini")


if __name__ == "__main__":
    unittest.main()
