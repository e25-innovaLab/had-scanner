import cors from "cors"
import express from "express"
import {
  createAnalysis,
  createProposal,
  getAnalysis,
  getAnalysisStatus,
  getBarrier,
  getExports,
  isResponse,
  listBarriers,
  listBarriersFlat,
  saveDraft,
  setBarrierStatus,
  startExport,
} from "../src/lib/api/service"
import type { ApiBarrier } from "../src/lib/api/types"

const PORT = Number(process.env.MOCK_PORT ?? 3001)

async function sendResult(
  res: express.Response,
  result: unknown,
  okStatus = 200
) {
  if (isResponse(result)) {
    const body = await result.text()
    res.status(result.status)
    const contentType = result.headers.get("content-type")
    if (contentType) res.setHeader("content-type", contentType)
    res.send(body || undefined)
    return
  }
  res.status(okStatus).json(result)
}

const app = express()
app.use(cors())
app.use(express.json())

app.post("/api/analyses", async (req, res, next) => {
  try {
    const body = req.body as {
      fileName?: string
      fileSize?: number
      text?: string
    }
    if (typeof body.text === "string" && body.text.trim()) {
      const analysis = await createAnalysis({
        fileName: "texto-pegado.txt",
        fileSize: new TextEncoder().encode(body.text).length,
      })
      await sendResult(res, analysis, 201)
      return
    }
    if (
      typeof body.fileName !== "string" ||
      typeof body.fileSize !== "number"
    ) {
      res.status(400).json({ error: "fileName y fileSize son requeridos" })
      return
    }
    const analysis = await createAnalysis({
      fileName: body.fileName,
      fileSize: body.fileSize,
    })
    await sendResult(res, analysis, 201)
  } catch (err) {
    next(err)
  }
})

app.get("/api/analyses/:id", async (req, res, next) => {
  try {
    await sendResult(res, await getAnalysis(req.params.id))
  } catch (err) {
    next(err)
  }
})

app.get("/api/analyses/:id/status", async (req, res, next) => {
  try {
    await sendResult(res, await getAnalysisStatus(req.params.id))
  } catch (err) {
    next(err)
  }
})

app.get("/api/analyses/:id/barriers", async (req, res, next) => {
  try {
    const flat = req.query.flat === "1" || req.query.flat === "true"
    if (flat) {
      const barriers = await listBarriersFlat(req.params.id)
      if (isResponse(barriers)) {
        await sendResult(res, barriers)
        return
      }
      res.json({ barriers })
      return
    }
    await sendResult(res, await listBarriers(req.params.id))
  } catch (err) {
    next(err)
  }
})

app.get("/api/analyses/:id/barriers/:barrierId", async (req, res, next) => {
  try {
    await sendResult(
      res,
      await getBarrier(req.params.id, req.params.barrierId)
    )
  } catch (err) {
    next(err)
  }
})

app.post(
  "/api/analyses/:id/barriers/:barrierId/proposals",
  async (req, res, next) => {
    try {
      const body = (req.body ?? {}) as {
        variant?: keyof ApiBarrier["variants"]
      }
      const result = await createProposal(req.params.id, req.params.barrierId, {
        variant: body.variant,
      })
      await sendResult(res, result, 201)
    } catch (err) {
      next(err)
    }
  }
)

app.put(
  "/api/analyses/:id/barriers/:barrierId/draft",
  async (req, res, next) => {
    try {
      const draft = (req.body as { draft?: string }).draft
      if (typeof draft !== "string") {
        res.status(400).json({ error: "draft es requerido" })
        return
      }
      await sendResult(
        res,
        await saveDraft(req.params.id, req.params.barrierId, draft)
      )
    } catch (err) {
      next(err)
    }
  }
)

app.post(
  "/api/analyses/:id/barriers/:barrierId/accept",
  async (req, res, next) => {
    try {
      const draft = (req.body as { draft?: string } | null)?.draft
      await sendResult(
        res,
        await setBarrierStatus(
          req.params.id,
          req.params.barrierId,
          "accepted",
          draft
        )
      )
    } catch (err) {
      next(err)
    }
  }
)

app.post(
  "/api/analyses/:id/barriers/:barrierId/discard",
  async (req, res, next) => {
    try {
      await sendResult(
        res,
        await setBarrierStatus(req.params.id, req.params.barrierId, "discarded")
      )
    } catch (err) {
      next(err)
    }
  }
)

app.post(
  "/api/analyses/:id/barriers/:barrierId/reopen",
  async (req, res, next) => {
    try {
      await sendResult(
        res,
        await setBarrierStatus(req.params.id, req.params.barrierId, "pending")
      )
    } catch (err) {
      next(err)
    }
  }
)

app.post("/api/analyses/:id/export", async (req, res, next) => {
  try {
    await sendResult(res, await startExport(req.params.id))
  } catch (err) {
    next(err)
  }
})

app.get("/api/analyses/:id/exports", async (req, res, next) => {
  try {
    await sendResult(res, await getExports(req.params.id))
  } catch (err) {
    next(err)
  }
})

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err)
    res.status(500).json({
      error: err instanceof Error ? err.message : "Error interno del mock",
    })
  }
)

app.listen(PORT, () => {
  console.log(`VERA mock API on http://localhost:${PORT}`)
})
