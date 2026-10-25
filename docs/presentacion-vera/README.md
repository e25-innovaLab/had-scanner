# Presentación VERA

## Videos

| Archivo | Qué es |
| --- | --- |
| [`vera-recorrido-ui.mp4`](./vera-recorrido-ui.mp4) | **Demo real** del frontend con mouse visible + narración `es-AR` |
| [`vera-recorrido.mp4`](./vera-recorrido.mp4) | Versión slides + narración (opción C) |

Voz: Edge TTS `es-AR-ElenaNeural` (español de Argentina).

## Regenerar demo con pantallas reales

1. En una terminal: `cd frontend && pnpm dev` (mock `:3001` + Vite `:5173`).
2. En otra:

```bash
cd docs/presentacion-vera
# Playwright (una vez)
npm install playwright
npx playwright install chromium

BASE_URL=http://localhost:5173 node record_tour.mjs

# Mezclar narración (requiere audio/ generada antes con build_video.py)
WEBM=$(ls -1 build/pw-video/*.webm | head -1)
ffmpeg -y -i "$WEBM" -i build/narracion-es-AR.mp3 \
  -filter_complex "[1:a]atempo=1.60,volume=1.05[a]" \
  -map 0:v -map "[a]" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest \
  vera-recorrido-ui.mp4
```

## Regenerar slides + voz

Ver script `build_video.py` (Pillow + edge-tts + ffmpeg). Guion en [`guion.md`](./guion.md).
