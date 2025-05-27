"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, PlayCircle, FileText, PlusCircle } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

type Experiment = {
  id: string
  name: string
  systemPrompt: string
  created_at: string
}

export function ExperimentList() {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchExperiments() {
      try {
        const supabase = createClient()

        const { data, error } = await supabase.from("experiments").select("*").order("created_at", { ascending: false })

        if (error) throw error

        setExperiments(data || [])
        setError(null)
      } catch (err) {
        console.error("Error fetching experiments:", err)
        setError("Failed to load experiments. Please check your connection and try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchExperiments()
  }, [])

  async function deleteExperiment(id: string) {
    try {
      const supabase = createClient()

      // First get all test cases for this experiment
      const { data: testCases } = await supabase.from("test_cases").select("id").eq("experiment_id", id)

      if (testCases && testCases.length > 0) {
        // Delete all evaluation results for these test cases
        const testCaseIds = testCases.map((tc) => tc.id)
        const { error: evalDeleteError } = await supabase
          .from("evaluation_results")
          .delete()
          .in("test_case_id", testCaseIds)

        if (evalDeleteError) throw evalDeleteError
      }

      // Delete all test cases for this experiment
      const { error: testCasesError } = await supabase.from("test_cases").delete().eq("experiment_id", id)

      if (testCasesError) throw testCasesError

      // Then delete the experiment
      const { error } = await supabase.from("experiments").delete().eq("id", id)

      if (error) throw error

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
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
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
  )
}
