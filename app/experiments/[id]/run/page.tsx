"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { ExperimentRunnerDirect } from "@/components/experiment-runner-direct"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

type Experiment = {
  id: string
  name: string
  systemPrompt: string
}

type TestCase = {
  id: string
  experiment_id: string
  input: string
  expected_output: string
  human_response: string
  category: string
}

export default function RunExperimentPage() {
  const params = useParams()
  const experimentId = params.id as string
  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Supabase environment variables are missing")
        }

        // Fetch experiment
        const experimentResponse = await fetch(`${supabaseUrl}/rest/v1/experiments?id=eq.${experimentId}&select=*`, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        })

        if (!experimentResponse.ok) {
          throw new Error(`API error: ${experimentResponse.statusText}`)
        }

        const experimentData = await experimentResponse.json()

        if (experimentData.length === 0) {
          throw new Error("Experiment not found")
        }

        setExperiment(experimentData[0])

        // Fetch test cases
        const testCasesResponse = await fetch(
          `${supabaseUrl}/rest/v1/test_cases?experiment_id=eq.${experimentId}&select=*`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          },
        )

        if (!testCasesResponse.ok) {
          throw new Error(`API error: ${testCasesResponse.statusText}`)
        }

        const testCasesData = await testCasesResponse.json()
        setTestCases(testCasesData)
        setError(null)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : "Failed to load data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [experimentId])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 container py-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-32 mb-6" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 container py-6">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Link href="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </main>
      </div>
    )
  }

  if (!experiment) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1 container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{experiment.name}</h1>
            <p className="text-muted-foreground">Run Experiment</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/experiments/${experimentId}/comparison`}>
              <Button variant="outline">View Comparison</Button>
            </Link>
          </div>
        </div>
        <ExperimentRunnerDirect experiment={experiment} testCases={testCases} />
      </main>
    </div>
  )
}
