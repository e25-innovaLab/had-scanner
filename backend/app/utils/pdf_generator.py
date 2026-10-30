import re
from html import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import (
    getSampleStyleSheet,
    ParagraphStyle,
)
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)


def _create_styles():
    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="DocumentTitle",
            parent=styles["Title"],
            alignment=TA_CENTER,
            fontSize=18,
            spaceAfter=24,
        )
    )

    styles.add(
        ParagraphStyle(
            name="DocumentHeading1",
            parent=styles["Heading1"],
            fontSize=16,
            spaceBefore=14,
            spaceAfter=8,
        )
    )

    styles.add(
        ParagraphStyle(
            name="DocumentHeading2",
            parent=styles["Heading2"],
            fontSize=13,
            spaceBefore=12,
            spaceAfter=6,
        )
    )

    styles.add(
        ParagraphStyle(
            name="DocumentHeading3",
            parent=styles["Heading3"],
            fontSize=11,
            spaceBefore=10,
            spaceAfter=5,
        )
    )

    styles.add(
        ParagraphStyle(
            name="DocumentBody",
            parent=styles["BodyText"],
            fontSize=10,
            leading=15,
            spaceAfter=8,
        )
    )

    return styles


def _inline_markdown(text: str) -> str:
    text = escape(text)

    text = re.sub(
        r"\*\*(.+?)\*\*",
        r"<b>\1</b>",
        text,
    )

    text = re.sub(
        r"(?<!\*)\*([^*]+)\*(?!\*)",
        r"<i>\1</i>",
        text,
    )

    text = re.sub(
        r"`([^`]+)`",
        r'<font name="Courier">\1</font>',
        text,
    )

    return text


def _add_markdown_content(
    story: list,
    content: str,
    styles,
):
    lines = content.splitlines()
    index = 0

    while index < len(lines):
        line = lines[index].strip()

        if not line:
            index += 1
            continue

        # Headings
        heading = re.match(r"^(#{1,3})\s+(.+)$", line)

        if heading:
            level = len(heading.group(1))

            story.append(
                Paragraph(
                    _inline_markdown(heading.group(2)),
                    styles[f"DocumentHeading{level}"],
                )
            )

            index += 1
            continue

        # Horizontal separator
        if re.fullmatch(r"-{3,}|\*{3,}", line):
            story.append(
                HRFlowable(
                    width="100%",
                    thickness=0.5,
                    color=colors.lightgrey,
                    spaceBefore=6,
                    spaceAfter=10,
                )
            )

            index += 1
            continue

        # Lists
        unordered = re.match(r"^[-*+]\s+(.+)$", line)
        ordered = re.match(r"^\d+[.)]\s+(.+)$", line)

        if unordered or ordered:
            is_ordered = ordered is not None
            items = []

            while index < len(lines):
                current = lines[index].strip()

                match = (
                    re.match(r"^[-*+]\s+(.+)$", current)
                    if not is_ordered
                    else re.match(r"^\d+[.)]\s+(.+)$", current)
                )

                if not match:
                    break

                items.append(
                    ListItem(
                        Paragraph(
                            _inline_markdown(match.group(1)),
                            styles["DocumentBody"],
                        )
                    )
                )

                index += 1

            story.append(
                ListFlowable(
                    items,
                    bulletType="1" if is_ordered else "bullet",
                    leftIndent=24,
                    bulletFontSize=9,
                )
            )

            story.append(Spacer(1, 6))
            continue

        # Normal paragraphs
        paragraph_lines = [line]
        index += 1

        while index < len(lines):
            current = lines[index].strip()

            if (
                not current
                or re.match(r"^#{1,3}\s+", current)
                or re.match(r"^[-*+]\s+", current)
                or re.match(r"^\d+[.)]\s+", current)
                or re.fullmatch(r"-{3,}|\*{3,}", current)
            ):
                break

            paragraph_lines.append(current)
            index += 1

        story.append(
            Paragraph(
                _inline_markdown(" ".join(paragraph_lines)),
                styles["DocumentBody"],
            )
        )


def generate_pdf(
    document: dict,
    output_path: str,
):
    styles = _create_styles()

    story = []

    story.append(
        Paragraph(
            escape(document.get("filename") or "Material educativo"),
            styles["DocumentTitle"],
        )
    )

    pages = document.get("pages", [])

    for page_index, page in enumerate(pages):

        if page_index > 0:
            story.append(PageBreak())

        for element in page.get("elements", []):

            text = element.get("text", "")

            if not text:
                continue

            # Adapted content is interpreted as Markdown.
            if element.get("_is_adaptation"):
                _add_markdown_content(
                    story=story,
                    content=text,
                    styles=styles,
                )
                continue

            # Original headings.
            if element.get("type") == "heading":
                level = element.get("heading_level", 1)
                level = min(max(level, 1), 3)

                story.append(
                    Paragraph(
                        _inline_markdown(text),
                        styles[f"DocumentHeading{level}"],
                    )
                )

                continue

            # Original paragraphs and text.
            story.append(
                Paragraph(
                    _inline_markdown(text).replace("\n", "<br/>"),
                    styles["DocumentBody"],
                )
            )

    pdf = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=document.get("filename", "Material educativo"),
    )

    pdf.build(story)