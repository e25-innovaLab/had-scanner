import unittest
from unittest.mock import MagicMock

from app.services.material_service import get_all_materials


class TestMaterials(unittest.TestCase):

    def test_get_all_materials_empty(self):
        db = MagicMock()
        db.scalars.return_value.all.return_value = []

        materials = get_all_materials(db=db)

        self.assertEqual(materials, [])
        self.assertEqual(len(materials), 0)


if __name__ == "__main__":
    unittest.main()