import os
import sys
import types
import unittest

os.environ.setdefault("DATABASE_URL", "sqlite://")

if "pymupdf4llm" not in sys.modules:
    sys.modules["pymupdf4llm"] = types.ModuleType("pymupdf4llm")


class TestFinalizedListRouteOrder(unittest.TestCase):
    def test_static_finalized_documents_registered_before_material_id(self) -> None:
        from app.routers.materials import router

        get_paths: list[str] = []
        for route in router.routes:
            methods = getattr(route, "methods", None) or set()
            path = getattr(route, "path", None)
            if path is None or "GET" not in methods:
                continue
            get_paths.append(path)

        static = "/materials/finalized-documents"
        dynamic = "/materials/{material_id}"
        self.assertIn(static, get_paths)
        self.assertIn(dynamic, get_paths)
        self.assertLess(get_paths.index(static), get_paths.index(dynamic))


if __name__ == "__main__":
    unittest.main()
