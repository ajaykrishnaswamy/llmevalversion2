"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { ResultsDashboard } from "@/components/results-dashboard"

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

export function ExperimentRunner({ experiment, testCases }: { experiment: Experiment; testCases: TestCase[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTestCase, setCurrentTestCase] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runExperiment = async () => {
    if (testCases.length === 0) {
      setError("No test cases found for this experiment. Please add test cases first.")
      return
    }

    setLoading(true)
    setProgress(0)
    setCurrentTestCase(null)
    setCompleted(false)
    setError(null)

    try {
      const supabase = createClient()

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i]
        setCurrentTestCase(testCase.input)

        // Call the API to evaluate the test case
        const response = await fetch("/api/evaluate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            system_prompt: experiment.systemPrompt,
            input: testCase.input,
            expected_output: testCase.expected_output,
            human_response: testCase.human_response,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `API error: ${response.statusText}`)
        }

        const result = await response.json()

        // Check if there's an existing evaluation result for this test case
        const { data: existingResults } = await supabase
          .from("evaluation_results")
          .select("id")
          .eq("test_case_id", testCase.id)

        if (existingResults && existingResults.length > 0) {
          // Update existing evaluation result
          const { error: updateError } = await supabase
            .from("evaluation_results")
            .update({
              llm_response: result.llm_response,
              factuality: result.factuality,
              closer_to_expected: result.closer_to_expected,
              explanation: result.explanation,
            })
            .eq("test_case_id", testCase.id)

          if (updateError) throw updateError
        } else {
          // Insert new evaluation result
          const { error: insertError } = await supabase.from("evaluation_results").insert({
            test_case_id: testCase.id,
            llm_response: result.llm_response,
            factuality: result.factuality,
            closer_to_expected: result.closer_to_expected,
            explanation: result.explanation,
          })

          if (insertError) throw insertError
        }

        // Update progress
        setProgress(Math.round(((i + 1) / testCases.length) * 100))
      }

      setCompleted(true)
      toast({
        title: "Experiment completed",
        description: "All test cases have been evaluated successfully.",
      })
    } catch (err) {
      console.error("Error running experiment:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      toast({
        title: "Error",
        description: "There was an error running the experiment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Run Experiment</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {completed && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>Experiment completed successfully!</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <p className="font-medium">System Prompt:</p>
              <p className="text-sm text-muted-foreground mt-1">{experiment.systemPrompt}</p>
            </div>

            <div>
              <p className="font-medium">Test Cases: {testCases.length}</p>
              {testCases.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  No test cases found. Please add test cases before running the experiment.
                </p>
              )}
            </div>

            {loading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {currentTestCase && (
                  <p className="text-sm text-muted-foreground">Evaluating: {currentTestCase.substring(0, 50)}...</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.back()} disabled={loading}>
            Back
          </Button>
          <Button onClick={runExperiment} disabled={loading || testCases.length === 0}>
            {loading ? "Running..." : "Run Experiment"}
          </Button>
        </CardFooter>
      </Card>

      {completed && <ResultsDashboard experimentId={experiment.id} />}
    </div>
  )
}
