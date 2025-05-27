"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { NewTestCaseForm } from "@/components/new-test-case-form"
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

export default function NewTestCasePage() {
  const params = useParams()
  const router = useRouter()
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
        <h1 className="text-3xl font-bold mb-2">{experiment.name}</h1>
        <p className="text-muted-foreground mb-6">Add New Test Case</p>
        <NewTestCaseForm experimentId={experimentId} />
      </main>
    </div>
  )
}
