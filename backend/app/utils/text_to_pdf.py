from io import BytesIO
from html import escape

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)


def text_to_pdf(text: str, title: str) -> bytes:
    output = BytesIO()

    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=title,
        pageCompression=1,
        invariant=1,
    )

    heading = ParagraphStyle(
        "PastedTextTitle",
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=21,
        spaceAfter=18,
        alignment=TA_LEFT,
    )

    body = ParagraphStyle(
        "PastedTextBody",
        fontName="Helvetica",
        fontSize=11,
        leading=16,
        spaceAfter=10,
        alignment=TA_LEFT,
        splitLongWords=True,
    )

    story = [Paragraph(escape(title), heading)]

    normalized = text.replace("\r\n", "\n").replace("\r", "\n")

    for paragraph in normalized.split("\n\n"):
        content = paragraph.strip("\n")

        if not content.strip():
            continue

        safe_text = "<br/>".join(
            escape(line) for line in content.split("\n")
        )

        story.append(Paragraph(safe_text, body))
        story.append(Spacer(1, 3))

    document.build(story)

    return output.getvalue()
