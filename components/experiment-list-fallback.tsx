"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, PlayCircle, FileText, PlusCircle } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

type Experiment = {
  id: string
  name: string
  systemPrompt: string
  created_at: string
}

// Mock data for development/preview environments
const MOCK_EXPERIMENTS: Experiment[] = [
  {
    id: "1",
    name: "Factual Knowledge Test",
    systemPrompt:
      "You are a helpful AI assistant that provides factual information. Answer the user's questions accurately and concisely.",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Medical Information Evaluation",
    systemPrompt:
      "You are a medical assistant providing accurate health information. Ensure all responses are factual and evidence-based.",
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
]

export function ExperimentListFallback() {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useMockData, setUseMockData] = useState(false)

  useEffect(() => {
    async function fetchExperiments() {
      try {
        // Check if we're in a development/preview environment
        const isDev = process.env.NODE_ENV === "development" || window.location.hostname.includes("vercel.app")

        // Try to fetch real data first
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
          console.warn("Supabase environment variables are missing, using mock data")
          setExperiments(MOCK_EXPERIMENTS)
          setUseMockData(true)
          return
        }

        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

          const response = await fetch(`${supabaseUrl}/rest/v1/experiments?select=*&order=created_at.desc`, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`)
          }

          const data = await response.json()
          setExperiments(data || [])
          setError(null)
        } catch (fetchError) {
          console.error("Error fetching from Supabase:", fetchError)

          // If in development or preview, fall back to mock data
          if (isDev) {
            console.log("Using mock data in development/preview environment")
            setExperiments(MOCK_EXPERIMENTS)
            setUseMockData(true)
          } else {
            throw fetchError
          }
        }
      } catch (err) {
        console.error("Error in experiment list:", err)
        setError("Failed to load experiments. Using fallback UI.")
        // Always show some UI even if there's an error
        setExperiments([])
      } finally {
        setLoading(false)
      }
    }

    fetchExperiments()
  }, [])

  async function deleteExperiment(id: string) {
    // If using mock data, just filter the experiments
    if (useMockData) {
      setExperiments(experiments.filter((exp) => exp.id !== id))
      return
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase environment variables are missing")
      }

      // Delete the experiment
      const response = await fetch(`${supabaseUrl}/rest/v1/experiments?id=eq.${id}`, {
        method: "DELETE",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      // Update the UI
      setExperiments(experiments.filter((exp) => exp.id !== id))
      setError(null)
    } catch (err) {
      console.error("Error deleting experiment:", err)
      setError("Failed to delete experiment. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-1/2 mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <>
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-xl font-semibold">Create your first experiment</h3>
            <p className="text-muted-foreground">Start evaluating LLM responses by creating an experiment.</p>
            <Link href="/experiments/new" className="mt-4">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Experiment
              </Button>
            </Link>
          </div>
        </Card>
      </>
    )
  }

  if (experiments.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold">No experiments yet</h3>
          <p className="text-muted-foreground">Create your first experiment to start evaluating LLM responses.</p>
          <Link href="/experiments/new" className="mt-4">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Experiment
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <>
      {useMockData && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Using Demo Data</AlertTitle>
          <AlertDescription>The application is currently using mock data for demonstration purposes.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {experiments.map((experiment) => (
          <Card key={experiment.id}>
            <CardHeader>
              <CardTitle>{experiment.name}</CardTitle>
              <CardDescription>Created on {new Date(experiment.created_at).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="line-clamp-3 text-sm text-muted-foreground">
                <strong>System Prompt:</strong> {experiment.systemPrompt}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex gap-2">
                <Link href={`/experiments/${experiment.id}/edit`}>
                  <Button variant="outline" size="icon">
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                </Link>
                <Button variant="outline" size="icon" onClick={() => deleteExperiment(experiment.id)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
              <div className="flex gap-2">
                <Link href={`/experiments/${experiment.id}/comparison`}>
                  <Button variant="outline">Compare</Button>
                </Link>
                <Link href={`/experiments/${experiment.id}/test-cases`}>
                  <Button variant="outline">Test Cases</Button>
                </Link>
                <Link href={`/experiments/${experiment.id}/run`}>
                  <Button>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Run
                  </Button>
                </Link>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  )
}
