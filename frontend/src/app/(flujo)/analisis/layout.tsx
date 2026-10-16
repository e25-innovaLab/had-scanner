import { Suspense, type ReactNode } from "react"
import { FlowResumeTracker } from "@/components/aula/flow-resume-tracker"
import { FlowNav } from "@/components/shell/flow-nav"

export default function AnalisisLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <Suspense fallback={<aside className="w-full shrink-0 md:w-56" aria-hidden="true" />}>
        <FlowNav />
        <FlowResumeTracker />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:px-10">
        {children}
      </main>
    </div>
  )
}
