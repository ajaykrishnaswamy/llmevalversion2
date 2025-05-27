"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { TestCaseListDirect } from "@/components/test-case-list-direct"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

type Experiment = {
  id: string
  name: string
  systemPrompt: string
}

export default function TestCasesPage() {
  const params = useParams()
  const experimentId = params.id as string
  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchExperiment() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Supabase environment variables are missing")
        }

        const response = await fetch(`${supabaseUrl}/rest/v1/experiments?id=eq.${experimentId}&select=*`, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.length === 0) {
          throw new Error("Experiment not found")
        }

        setExperiment(data[0])
        setError(null)
      } catch (err) {
        console.error("Error fetching experiment:", err)
        setError(err instanceof Error ? err.message : "Failed to load experiment. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchExperiment()
  }, [experimentId])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 container py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
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
            <p className="text-muted-foreground">Test Cases</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/experiments/${experimentId}/comparison`}>
              <Button variant="outline">View Comparison</Button>
            </Link>
            <Link href={`/experiments/${experimentId}/test-cases/new`}>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Test Case
              </Button>
            </Link>
          </div>
        </div>
        <TestCaseListDirect experimentId={experimentId} />
      </main>
    </div>
  )
}
