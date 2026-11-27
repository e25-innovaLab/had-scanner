"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

const HEALTH_ATTEMPT_TIMEOUT_MS = 8000;
const HEALTH_RETRY_GAP_MS = 2000;
const HEALTH_MAX_WAIT_MS = 180_000;
const CONNECTION_SEGMENTS = 8;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function useBackendHealth() {
  const [backendUp, setBackendUp] = useState<boolean | null>(null);
  const [connectionFilled, setConnectionFilled] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    void (async () => {
      while (!cancelled) {
        const ok = await api.isBackendHealthy({
          timeoutMs: HEALTH_ATTEMPT_TIMEOUT_MS,
        });
        if (cancelled) return;

        if (ok) {
          setBackendUp(true);
          return;
        }

        if (Date.now() - startedAt >= HEALTH_MAX_WAIT_MS) {
          setBackendUp(false);
          return;
        }

        await sleep(HEALTH_RETRY_GAP_MS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (backendUp === true) {
      setConnectionFilled(CONNECTION_SEGMENTS);
      return;
    }
    if (backendUp === false) {
      return;
    }

    setConnectionFilled(1);
    const timer = window.setInterval(() => {
      setConnectionFilled((current) =>
        current >= CONNECTION_SEGMENTS - 1 ? 1 : current + 1,
      );
    }, 450);

    return () => {
      window.clearInterval(timer);
    };
  }, [backendUp]);

  return {
    backendUp,
    connectionFilled,
    connectionSegments: CONNECTION_SEGMENTS,
    checking: backendUp === null,
    ready: backendUp === true,
  };
}
