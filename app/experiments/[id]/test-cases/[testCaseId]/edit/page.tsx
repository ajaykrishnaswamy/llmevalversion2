import { DashboardHeader } from "@/components/dashboard-header"
import { TestCaseForm } from "@/components/test-case-form"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

export default async function EditTestCasePage({ params }: { params: { id: string; testCaseId: string } }) {
  const supabase = createClient()

  const { data: experiment, error: experimentError } = await supabase
    .from("experiments")
    .select("*")
    .eq("id", params.id)
    .single()

  if (experimentError || !experiment) {
    notFound()
  }

  const { data: testCase, error: testCaseError } = await supabase
    .from("test_cases")
    .select("*")
    .eq("id", params.testCaseId)
    .single()

  if (testCaseError || !testCase) {
    notFound()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1 container py-6">
        <h1 className="text-3xl font-bold mb-2">{experiment.name}</h1>
        <p className="text-muted-foreground mb-6">Edit Test Case</p>
        <TestCaseForm experimentId={params.id} testCase={testCase} />
      </main>
    </div>
  )
}
