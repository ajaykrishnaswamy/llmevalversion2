import Link from "next/link"
import { Brain } from "lucide-react"

export function DashboardHeader() {
  return (
    <header className="border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Brain className="h-6 w-6" />
          <span className="font-bold">LLM Evaluation Platform</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium hover:underline">
            Dashboard
          </Link>
          <Link href="/experiments" className="text-sm font-medium hover:underline">
            Experiments
          </Link>
        </nav>
      </div>
    </header>
  )
}
