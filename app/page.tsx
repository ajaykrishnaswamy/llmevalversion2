import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard-header"
import { ExperimentListFallback } from "@/components/experiment-list-fallback"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1 container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">LLM Evaluation Platform</h1>
          <Link href="/experiments/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Experiment
            </Button>
          </Link>
        </div>
        <div className="grid gap-6">
          <ExperimentListFallback />
        </div>
      </main>
    </div>
  )
}
