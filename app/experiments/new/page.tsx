"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { NewExperimentForm } from "@/components/new-experiment-form"

export default function NewExperimentPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1 container py-6">
        <h1 className="text-3xl font-bold mb-6">Create New Experiment</h1>
        <NewExperimentForm />
      </main>
    </div>
  )
}
