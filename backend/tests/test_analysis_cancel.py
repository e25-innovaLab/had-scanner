import unittest
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  (registra todos los modelos)
from app.core.exceptions import AnalysisCancelledException
from app.database.base import Base
from app.models.analysis import Analysis
from app.models.barrier import Barrier
from app.models.material import Material
from app.repositories import analysis_repository
from app.services.analysis_persistence_service import persist_analysis

EMPTY_RESULT = {"accessibility_analysis": {"barriers": []}}


class AnalysisLifecycleTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine(
            "sqlite://",
            poolclass=StaticPool,
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(engine)
        self.engine = engine
        self.db = sessionmaker(bind=engine)()

        material = Material(name="m.pdf", file_path="x.pdf", file_hash="h")
        self.db.add(material)
        self.db.commit()

        self.material_id = material.id
        self.analysis = analysis_repository.create_pending(
            db=self.db,
            material_id=material.id,
        )

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def _status(self, analysis_id=None) -> str:
        analysis = self.db.get(Analysis, analysis_id or self.analysis.id)
        self.db.refresh(analysis)
        return analysis.status

    def _age(self, analysis_id: int, minutes: int) -> None:
        analysis = self.db.get(Analysis, analysis_id)
        analysis.updated_at = datetime.now(timezone.utc) - timedelta(
            minutes=minutes
        )
        self.db.commit()

    # --- cancelar ---------------------------------------------------------

    def test_cancel_closes_immediately_and_is_not_repeatable(self):
        self.assertTrue(
            analysis_repository.request_cancellation(
                db=self.db, analysis_id=self.analysis.id
            )
        )
        self.assertEqual(self._status(), "cancelled")
        self.assertEqual(self.analysis.current_step, "cancelled")

        self.assertFalse(
            analysis_repository.request_cancellation(
                db=self.db, analysis_id=self.analysis.id
            )
        )

    def test_late_result_is_discarded_after_cancel(self):
        analysis_repository.request_cancellation(
            db=self.db, analysis_id=self.analysis.id
        )

        with self.assertRaises(AnalysisCancelledException):
            persist_analysis(
                db=self.db,
                analysis_id=self.analysis.id,
                analysis_result=EMPTY_RESULT,
            )

        self.assertEqual(self._status(), "cancelled")
        barriers = self.db.scalar(select(func.count()).select_from(Barrier))
        self.assertEqual(barriers, 0)

    def test_persist_completes_when_still_processing(self):
        persist_analysis(
            db=self.db,
            analysis_id=self.analysis.id,
            analysis_result=EMPTY_RESULT,
        )
        self.assertEqual(self._status(), "completed")

    def test_failure_does_not_overwrite_cancelled(self):
        analysis_repository.request_cancellation(
            db=self.db, analysis_id=self.analysis.id
        )
        analysis_repository.mark_failed_if_processing(
            db=self.db, analysis_id=self.analysis.id
        )
        self.assertEqual(self._status(), "cancelled")

    # --- fallos y huérfanos ----------------------------------------------

    def test_mark_failed_stores_custom_message(self):
        analysis_repository.mark_failed_if_processing(
            db=self.db,
            analysis_id=self.analysis.id,
            error_message="La IA no está disponible.",
        )
        analysis = self.db.get(Analysis, self.analysis.id)
        self.db.refresh(analysis)
        self.assertEqual(analysis.status, "failed")
        self.assertEqual(analysis.error_message, "La IA no está disponible.")

    def test_is_stale_depends_on_heartbeat(self):
        self._age(self.analysis.id, minutes=2)
        fresh = self.db.get(Analysis, self.analysis.id)
        self.db.refresh(fresh)
        self.assertFalse(analysis_repository.is_stale(fresh))

        self._age(self.analysis.id, minutes=120)
        old = self.db.get(Analysis, self.analysis.id)
        self.db.refresh(old)
        self.assertTrue(analysis_repository.is_stale(old))

    def test_heartbeat_refreshes_processing_but_not_cancelled(self):
        self._age(self.analysis.id, minutes=120)
        analysis_repository.touch_heartbeat(
            db=self.db, analysis_id=self.analysis.id
        )
        refreshed = self.db.get(Analysis, self.analysis.id)
        self.db.refresh(refreshed)
        self.assertFalse(analysis_repository.is_stale(refreshed))

        analysis_repository.request_cancellation(
            db=self.db, analysis_id=self.analysis.id
        )
        self._age(self.analysis.id, minutes=120)
        analysis_repository.touch_heartbeat(
            db=self.db, analysis_id=self.analysis.id
        )
        cancelled = self.db.get(Analysis, self.analysis.id)
        self.db.refresh(cancelled)
        self.assertTrue(analysis_repository.is_stale(cancelled))

    def test_fail_interrupted_only_touches_unfinished(self):
        done = analysis_repository.create_pending(
            db=self.db, material_id=self.material_id
        )
        analysis_repository.update_status(
            db=self.db, analysis_id=done.id, status="completed"
        )

        count = analysis_repository.fail_interrupted_analyses(db=self.db)

        self.assertEqual(count, 1)
        self.assertEqual(self._status(), "failed")
        self.assertEqual(self._status(done.id), "completed")


if __name__ == "__main__":
    unittest.main()
