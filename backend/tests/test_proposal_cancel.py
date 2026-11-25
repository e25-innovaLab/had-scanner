import os
import sys
import types
import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

os.environ.setdefault("GEMINI_API_KEY", "test-key")


def _ensure_import_stubs() -> None:
    if "pymupdf4llm" not in sys.modules:
        sys.modules["pymupdf4llm"] = types.ModuleType("pymupdf4llm")
    if "google" not in sys.modules:
        google = types.ModuleType("google")
        genai = types.ModuleType("google.genai")
        genai.Client = MagicMock
        google.genai = genai
        sys.modules["google"] = google
        sys.modules["google.genai"] = genai


_ensure_import_stubs()


class TestCancelAdaptationProposalGeneration(unittest.TestCase):
    def test_cancel_missing_barrier(self) -> None:
        from app.services.adaptation_service import (
            cancel_adaptation_proposal_generation,
        )

        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with self.assertRaises(HTTPException) as ctx:
            cancel_adaptation_proposal_generation(db=db, barrier_id=9)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_cancel_delegates_to_repository(self) -> None:
        from app.services.adaptation_service import (
            cancel_adaptation_proposal_generation,
        )

        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = (
            MagicMock()
        )
        with patch(
            "app.services.adaptation_service.proposal_generation_repository.request_cancellation",
            return_value=True,
        ) as request_cancel:
            ok = cancel_adaptation_proposal_generation(db=db, barrier_id=3)
        self.assertTrue(ok)
        request_cancel.assert_called_once_with(db=db, barrier_id=3)


class TestCreateAdaptationProposalCancel(unittest.TestCase):
    def test_does_not_persist_when_cancelled_after_gemini(self) -> None:
        from app.services.adaptation_service import create_adaptation_proposal

        db = MagicMock()
        barrier = MagicMock()
        barrier.id = 4
        barrier.type = "lenguaje"
        barrier.title = "t"
        barrier.description = "d"
        barrier.justification = "j"
        barrier.recommendation = "r"

        with (
            patch(
                "app.services.adaptation_service.proposal_generation_repository.begin_generation",
            ) as begin,
            patch(
                "app.services.adaptation_service.proposal_generation_repository.is_cancellation_requested",
                side_effect=[False, True],
            ),
            patch(
                "app.services.adaptation_service.proposal_generation_repository.finish_generation",
            ) as finish,
            patch(
                "app.services.adaptation_service._get_barrier_original_content",
                return_value=(barrier, "texto"),
            ),
            patch(
                "app.services.adaptation_service.generate_adaptation",
                return_value={
                    "proposed_content": "adaptado",
                    "explanation": "porque",
                },
            ),
            patch(
                "app.services.adaptation_service.proposal_repository.create",
            ) as create_proposal,
        ):
            with self.assertRaises(HTTPException) as ctx:
                create_adaptation_proposal(db=db, barrier_id=4)

        self.assertEqual(ctx.exception.status_code, 409)
        begin.assert_called_once()
        create_proposal.assert_not_called()
        finish.assert_called_once_with(db=db, barrier_id=4)

    def test_persists_when_not_cancelled(self) -> None:
        from app.services.adaptation_service import create_adaptation_proposal

        db = MagicMock()
        barrier = MagicMock()
        barrier.id = 5
        barrier.type = "lenguaje"
        barrier.title = "t"
        barrier.description = "d"
        barrier.justification = "j"
        barrier.recommendation = "r"
        created = MagicMock()

        with (
            patch(
                "app.services.adaptation_service.proposal_generation_repository.begin_generation",
            ),
            patch(
                "app.services.adaptation_service.proposal_generation_repository.is_cancellation_requested",
                return_value=False,
            ),
            patch(
                "app.services.adaptation_service.proposal_generation_repository.finish_generation",
            ) as finish,
            patch(
                "app.services.adaptation_service._get_barrier_original_content",
                return_value=(barrier, "texto"),
            ),
            patch(
                "app.services.adaptation_service.generate_adaptation",
                return_value={
                    "proposed_content": "adaptado",
                    "explanation": "porque",
                },
            ),
            patch(
                "app.services.adaptation_service.proposal_repository.create",
                return_value=created,
            ) as create_proposal,
        ):
            result = create_adaptation_proposal(db=db, barrier_id=5)

        self.assertIs(result, created)
        create_proposal.assert_called_once()
        finish.assert_called_once_with(db=db, barrier_id=5)


if __name__ == "__main__":
    unittest.main()
