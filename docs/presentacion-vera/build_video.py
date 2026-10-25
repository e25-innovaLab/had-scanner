#!/usr/bin/env python3
"""Genera slides PNG + audio TTS (es-AR) + video MP4 de la presentación VERA."""

from __future__ import annotations

import asyncio
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SLIDES_DIR = ROOT / "slides"
AUDIO_DIR = ROOT / "audio"
BUILD_DIR = ROOT / "build"
OUT_VIDEO = ROOT / "vera-recorrido.mp4"

W, H = 1920, 1080
BG = (245, 248, 251)
PRIMARY = (15, 45, 90)
ACCENT = (37, 99, 140)
MUTED = (90, 110, 130)
SOFT = (210, 228, 240)
WHITE = (255, 255, 255)

FONT_REG = "/nix/store/9xy3p0iqmzhgdd5q58ysnbw8radgpgpq-montserrat-9.000/share/fonts/ttf/Montserrat-Medium.ttf"
FONT_BOLD = "/nix/store/9xy3p0iqmzhgdd5q58ysnbw8radgpgpq-montserrat-9.000/share/fonts/ttf/Montserrat-Bold.ttf"
VOICE = "es-AR-ElenaNeural"

# (filename_stem, eyebrow, title, bullets, narration)
SLIDES: list[tuple[str, str, str, list[str], str]] = [
    (
        "00-portada",
        "Aula Virtual",
        "VERA",
        [
            "Accesibilidad de materiales educativos",
            "Docente + IA, con el original intacto",
        ],
        "VERA ayuda a docentes a adaptar materiales para que sean más accesibles… sin tocar el original.",
    ),
    (
        "01-recorrido",
        "Estado actual",
        "El recorrido",
        [
            "01 Cargar → 02 Analizar → 03 Revisar",
            "04 Adaptar → 05 Obtener resultado",
        ],
        "Un recorrido claro de cinco pasos: cargar, analizar, revisar, adaptar y obtener el resultado.",
    ),
    (
        "02-cargar",
        "Paso 01",
        "Cargar material",
        [
            "El docente sube el material educativo",
            "Punto de entrada único al flujo",
        ],
        "Empezás cargando el material. Un solo punto de entrada al flujo.",
    ),
    (
        "03-analizar",
        "Paso 02",
        "Analizar material",
        [
            "Seis dimensiones de accesibilidad",
            "Proceso automático, sin intervención",
        ],
        "El sistema analiza el documento en seis dimensiones de accesibilidad. Es automático: vos no tenés que intervenir todavía.",
    ),
    (
        "04-revisar",
        "Paso 03",
        "Revisar barreras",
        [
            "Diagnóstico completo a la vista",
            "Todavía no se genera ninguna adaptación",
        ],
        "Después ves el diagnóstico completo: todas las barreras detectadas. Todavía no se genera ninguna adaptación.",
    ),
    (
        "05-adaptar",
        "Paso 04",
        "Adaptar con IA",
        [
            "Trabajo por dimensión e intentos por barrera",
            "Propuesta IA, edición manual o descarte",
        ],
        "En Adaptar trabajás por dimensión. Cada barrera tiene sus propios intentos de IA. Pedís una propuesta, la editás a mano o la descartás.",
    ),
    (
        "06-detalle",
        "Paso 04 · Detalle",
        "Decidir en cada barrera",
        [
            "Observación IA + original + propuesta",
            "Guardar y aceptar, o descartar",
        ],
        "En el detalle ves qué detectó la IA, el original y la propuesta. Decidís vos: guardar y aceptar, o descartar. Ningún cambio se aplica solo.",
    ),
    (
        "07-resultado",
        "Paso 05",
        "Obtener resultado",
        [
            "Material adaptado + informe final",
            "Aviso antes de salir si no hay cuenta",
        ],
        "Al final obtenés el material adaptado y el informe. Descargás los archivos… y si estás sin cuenta, VERA te avisa antes de salir.",
    ),
    (
        "08-cierre",
        "Hasta ahora",
        "Docente siempre en el loop",
        [
            "Recorrido claro, decisiones humanas",
            "El original permanece intacto",
        ],
        "Eso es VERA hasta ahora: un recorrido claro, con el docente siempre en el loop.",
    ),
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def draw_slide(
    eyebrow: str, title: str, bullets: list[str], index: int, total: int
) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Left accent bar
    draw.rectangle((0, 0, 18, H), fill=ACCENT)
    # Soft top band
    draw.rectangle((18, 0, W, 140), fill=SOFT)

    f_eye = font(FONT_BOLD, 36)
    f_title = font(FONT_BOLD, 92)
    f_body = font(FONT_REG, 44)
    f_foot = font(FONT_REG, 28)

    draw.text((80, 48), eyebrow.upper(), fill=ACCENT, font=f_eye)
    draw.text((80, 220), title, fill=PRIMARY, font=f_title)

    y = 400
    for bullet in bullets:
        for line in textwrap.wrap(bullet, width=42):
            draw.text((80, y), f"·  {line}", fill=MUTED, font=f_body)
            y += 70
        y += 16

    draw.text(
        (80, H - 80),
        f"VERA  ·  {index + 1:02d} / {total:02d}",
        fill=MUTED,
        font=f_foot,
    )
    return img


async def synthesize(text: str, out_mp3: Path) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(text, VOICE, rate="-5%")
    await communicate.save(str(out_mp3))


def audio_duration(path: Path) -> float:
    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(probe.stdout.strip())


def make_clip(png: Path, mp3: Path, out_mp4: Path, duration: float) -> None:
    # Pad a touch so audio never cuts early
    dur = duration + 0.35
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(png),
            "-i",
            str(mp3),
            "-c:v",
            "libx264",
            "-tune",
            "stillimage",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-pix_fmt",
            "yuv420p",
            "-shortest",
            "-t",
            f"{dur:.3f}",
            "-vf",
            "scale=1920:1080",
            str(out_mp4),
        ],
        check=True,
        capture_output=True,
    )


async def main() -> None:
    SLIDES_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)

    total = len(SLIDES)
    clip_paths: list[Path] = []

    for i, (stem, eyebrow, title, bullets, narration) in enumerate(SLIDES):
        png = SLIDES_DIR / f"{stem}.png"
        mp3 = AUDIO_DIR / f"{stem}.mp3"
        clip = BUILD_DIR / f"{stem}.mp4"

        print(f"[{i + 1}/{total}] slide {stem}")
        draw_slide(eyebrow, title, bullets, i, total).save(png)

        print(f"         tts → {mp3.name}")
        await synthesize(narration, mp3)

        dur = audio_duration(mp3)
        print(f"         clip ({dur:.1f}s)")
        make_clip(png, mp3, clip, dur)
        clip_paths.append(clip)

    concat_list = BUILD_DIR / "concat.txt"
    concat_list.write_text(
        "".join(f"file '{p.resolve()}'\n" for p in clip_paths), encoding="utf-8"
    )

    print(f"Concat → {OUT_VIDEO}")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_list),
            "-c",
            "copy",
            str(OUT_VIDEO),
        ],
        check=True,
        capture_output=True,
    )
    print("Listo:", OUT_VIDEO)


if __name__ == "__main__":
    asyncio.run(main())
