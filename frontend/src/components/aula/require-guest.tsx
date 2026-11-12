import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hasGuestSession } from "@/lib/api/guest-session";

export function RequireGuest({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (!hasGuestSession()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  return children;
}
