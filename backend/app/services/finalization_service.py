import os
import uuid

from pathlib import Path

from sqlalchemy.orm import Session

from app.repositories import (
    finalization_repository,
)
from app.repositories import material_repository
from app.utils.pdf_parser import extract_document
from app.utils.pdf_generator import generate_pdf


class NoCompletedAnalysisError(Exception):
    pass


class ProposalEvidenceError(Exception):
    pass


def _apply_adaptations(
    document: dict,
    barriers: list,
    proposals: list,
) -> dict:

    elements = [
        element
        for page in document.get("pages", [])
        for element in page.get("elements", [])
    ]

    element_positions = {
        element["element_id"]: index
        for index, element in enumerate(elements)
        if element.get("element_id")
    }

    barriers_by_id = {
        barrier.id: barrier
        for barrier in barriers
    }

    replacements = {}
    skipped_elements = set()
    claimed_elements = set()

    for proposal in proposals:

        barrier = barriers_by_id.get(proposal.barrier_id)

        if barrier is None:
            continue

        element_ids = list(dict.fromkeys(
            evidence.element_id
            for evidence in barrier.evidences
            if evidence.element_id
        ))

        if not element_ids:
            raise ProposalEvidenceError(
                f"Proposal {proposal.id} has no linked evidence."
            )

        missing_ids = [
            element_id
            for element_id in element_ids
            if element_id not in element_positions
        ]

        if missing_ids:
            raise ProposalEvidenceError(
                f"Proposal {proposal.id} references "
                f"unknown elements: {missing_ids}"
            )

        # Order elements according to their position in the document.
        element_ids.sort(
            key=lambda element_id: element_positions[element_id]
        )

        # Avoid applying overlapping proposals.
        if any(
            element_id in claimed_elements
            for element_id in element_ids
        ):
            raise ProposalEvidenceError(
                f"Proposal {proposal.id} overlaps another proposal."
            )

        # Replace the first original element.
        first_element_id = element_ids[0]

        replacements[first_element_id] = (
            proposal.proposed_content
        )

        # The remaining original elements are already
        # represented by the proposed content.
        skipped_elements.update(element_ids[1:])

        claimed_elements.update(element_ids)

    adapted_pages = []

    for page in document.get("pages", []):

        adapted_elements = []

        for element in page.get("elements", []):

            element_id = element.get("element_id")

            if element_id in skipped_elements:
                continue

            if element_id in replacements:

                adapted_element = {
                    **element,
                    "text": replacements[element_id],
                    "_is_adaptation": True,
                }

                adapted_elements.append(adapted_element)

            else:
                adapted_elements.append(element)

        adapted_pages.append({
            **page,
            "elements": adapted_elements,
        })

    return {
        **document,
        "pages": adapted_pages,
    }


def finalize_material(
    db: Session,
    material_id: int,
) -> tuple[str, str]:

    material = material_repository.get_by_id(
        db=db,
        material_id=material_id,
    )

    if material is None:
        raise LookupError("Material not found")

    if not os.path.isfile(material.file_path):
        raise FileNotFoundError("Material file not found")

    # 1. Retrieve the latest completed analysis.
    analysis = (
        finalization_repository.get_latest_completed_analysis(
            db=db,
            material_id=material_id,
        )
    )

    if analysis is None:
        raise NoCompletedAnalysisError(
            "Material has no completed analysis."
        )

    # 2. Retrieve barriers and their evidences.
    barriers = finalization_repository.get_barriers_by_analysis(
        db=db,
        analysis_id=analysis.id,
    )

    barrier_ids = [
        barrier.id
        for barrier in barriers
    ]

    # 3. Retrieve accepted proposals.
    proposals = finalization_repository.get_proposals_by_barriers(
        db=db,
        barrier_ids=barrier_ids,
        statuses=["accepted"],
    )

    # 4. Parse the original document.
    document = extract_document(material.file_path)

    # 5. Apply the adaptations.
    adapted_document = _apply_adaptations(
        document=document,
        barriers=barriers,
        proposals=proposals,
    )

    # 6. Create the output directory.
    output_dir = os.getenv(
        "FINALIZED_DIR",
        "/app/data/finalized",
    )

    os.makedirs(output_dir, exist_ok=True)

    # 7. Generate a unique filename.
    filename = (
        f"{Path(material.file_path).stem}_final_"
        f"{uuid.uuid4().hex[:8]}.pdf"
    )

    output_path = os.path.join(
        output_dir,
        filename,
    )

    # 8. Generate the PDF.
    generate_pdf(
        document=adapted_document,
        output_path=output_path,
    )

    return output_path, filename