import { Outlet } from "react-router-dom"
import { HomeNav } from "@/components/shell/home-nav"

export function HomeLayout() {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <HomeNav />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:px-10">
        <div className="mx-auto w-full max-w-3xl pb-20">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
