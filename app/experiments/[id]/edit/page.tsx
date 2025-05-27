import { DashboardHeader } from "@/components/dashboard-header"
import { ExperimentForm } from "@/components/experiment-form"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

export default async function EditExperimentPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: experiment, error } = await supabase.from("experiments").select("*").eq("id", params.id).single()

  if (error || !experiment) {
    notFound()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1 container py-6">
        <h1 className="text-3xl font-bold mb-6">Edit Experiment</h1>
        <ExperimentForm experiment={experiment} />
      </main>
    </div>
  )
}
