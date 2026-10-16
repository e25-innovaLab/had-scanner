import { Outlet } from "react-router-dom"
import { AppHeader } from "@/components/shell/app-header"
import { IaFab } from "@/components/shell/ia-fab"

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
      <IaFab />
    </div>
  )
}
