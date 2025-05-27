"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import { ResultsDashboardDirect } from "@/components/results-dashboard-direct"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Experiment = {
  id: string
  name: string
  systemPrompt: string
  models: string[]
}

type TestCase = {
  id: string
  experiment_id: string
  input: string
  expected_output: string
  human_response: string
  category: string
}

// Updated model names with current and deprecated models
const MODEL_NAMES: Record<string, string> = {
  "llama3-70b-8192": "Llama 3 (70B)",
  "llama3-8b-8192": "Llama 3 (8B)",
  "claude-3-haiku-20240307": "Claude 3 Haiku",
  "claude-3-opus-20240229": "Claude 3 Opus",
  "claude-3-sonnet-20240229": "Claude 3 Sonnet",
  // Deprecated models (kept for historical data)
  "mixtral-8x7b-32768": "Mixtral 8x7B (Deprecated)",
  "gemma-7b-it": "Gemma 7B (Deprecated)",
}

// Define currently supported models
const SUPPORTED_MODELS = {
  "llama3-70b-8192": true,
  "llama3-8b-8192": true,
  "claude-3-haiku-20240307": true,
  "claude-3-opus-20240229": true,
  "claude-3-sonnet-20240229": true,
}

export function ExperimentRunnerDirect({ experiment, testCases }: { experiment: Experiment; testCases: TestCase[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTestCase, setCurrentTestCase] = useState<string | null>(null)
  const [currentModel, setCurrentModel] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>("run")
  const [detailedError, setDetailedError] = useState<string | null>(null)

  // Filter out deprecated models and ensure we have at least one valid model
  const validModels = experiment.models?.filter((modelId) => SUPPORTED_MODELS[modelId]) || []
  const models = validModels.length > 0 ? validModels : ["llama3-70b-8192"]

  // Check if we had to filter out any models
  const hasDeprecatedModels = experiment.models?.some((modelId) => !SUPPORTED_MODELS[modelId]) || false

  // Add warning for deprecated models on component mount
  useEffect(() => {
    if (hasDeprecatedModels) {
      const deprecatedModels = experiment.models?.filter((modelId) => !SUPPORTED_MODELS[modelId]) || []
      const deprecatedModelNames = deprecatedModels.map((modelId) => MODEL_NAMES[modelId] || modelId).join(", ")

      setWarnings([
        `The following models are deprecated and will be replaced with supported alternatives: ${deprecatedModelNames}`,
      ])
    }
  }, [experiment.models, hasDeprecatedModels])

  const runExperiment = async () => {
    if (testCases.length === 0) {
      setError("No test cases found for this experiment. Please add test cases first.")
      return
    }

    setLoading(true)
    setProgress(0)
    setCurrentTestCase(null)
    setCurrentModel(null)
    setCompleted(false)
    setError(null)
    setDetailedError(null)

    // Keep existing warnings about deprecated models
    const initialWarnings = hasDeprecatedModels ? warnings : []
    setWarnings(initialWarnings)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase environment variables are missing")
      }

      // Calculate total steps (testCases × models)
      const totalSteps = testCases.length * models.length
      let completedSteps = 0
      const modelErrors = []

      // Process each model
      for (const modelId of models) {
        setCurrentModel(MODEL_NAMES[modelId] || modelId)

        // Process each test case with this model
        for (let i = 0; i < testCases.length; i++) {
          const testCase = testCases[i]
          setCurrentTestCase(testCase.input)

          try {
            // Call the API to evaluate the test case with this model
            console.log(`Evaluating test case: ${testCase.input.substring(0, 50)}... with model: ${modelId}`)

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
                model_id: modelId,
              }),
            })

            // Check for HTTP errors
            if (!response.ok) {
              let errorMessage = `API error: ${response.status} ${response.statusText}`

              try {
                const errorData = await response.json()
                if (errorData.error || errorData.message) {
                  errorMessage = `API error: ${errorData.error || ""} ${errorData.message || ""}`
                  console.error("API error details:", errorData)
                  setDetailedError(JSON.stringify(errorData, null, 2))
                }
              } catch (parseError) {
                console.error("Error parsing error response:", parseError)
              }

              throw new Error(errorMessage)
            }

            // Parse the response
            let result
            try {
              result = await response.json()
            } catch (parseError) {
              console.error("Error parsing response:", parseError)
              throw new Error("Failed to parse API response")
            }

            // Check if we're using a fallback model
            if (result.using_fallback) {
              const warningMsg = `Model "${MODEL_NAMES[modelId] || modelId}" is using "${MODEL_NAMES[result.actual_model_id] || result.actual_model_id}" as a fallback.`
              if (!warnings.includes(warningMsg)) {
                setWarnings((prev) => [...prev, warningMsg])
              }
            }

            // Check if there's an existing evaluation result for this test case and model
            const checkResponse = await fetch(
              `${supabaseUrl}/rest/v1/evaluation_results?test_case_id=eq.${testCase.id}&model_id=eq.${modelId}&select=id`,
              {
                headers: {
                  apikey: supabaseKey,
                  Authorization: `Bearer ${supabaseKey}`,
                },
              },
            )

            if (!checkResponse.ok) {
              throw new Error(`API error: ${checkResponse.statusText}`)
            }

            const existingResults = await checkResponse.json()

            // Prepare the data to save
            const evaluationData = {
              llm_response: result.llm_response,
              factuality: result.llm_factuality !== undefined ? result.llm_factuality : result.factuality,
              human_factuality: result.human_factuality,
              closer_to_expected: result.closer_to_expected,
              explanation: result.llm_explanation !== undefined ? result.llm_explanation : result.explanation,
              human_explanation: result.human_explanation,
            }

            if (existingResults && existingResults.length > 0) {
              // Update existing evaluation result
              console.log(`Updating existing evaluation for test case: ${testCase.id}, model: ${modelId}`)
              const updateResponse = await fetch(
                `${supabaseUrl}/rest/v1/evaluation_results?id=eq.${existingResults[0].id}`,
                {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                    Prefer: "return=representation",
                  },
                  body: JSON.stringify(evaluationData),
                },
              )

              if (!updateResponse.ok) {
                throw new Error(`API error: ${updateResponse.statusText}`)
              }
            } else {
              // Insert new evaluation result
              console.log(`Creating new evaluation for test case: ${testCase.id}, model: ${modelId}`)
              const insertResponse = await fetch(`${supabaseUrl}/rest/v1/evaluation_results`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: supabaseKey,
                  Authorization: `Bearer ${supabaseKey}`,
                  Prefer: "return=representation",
                },
                body: JSON.stringify({
                  test_case_id: testCase.id,
                  model_id: modelId,
                  ...evaluationData,
                }),
              })

              if (!insertResponse.ok) {
                throw new Error(`API error: ${insertResponse.statusText}`)
              }
            }
          } catch (err) {
            console.error(`Error evaluating test case with model ${modelId}:`, err)
            const errorMessage = err instanceof Error ? err.message : "Unknown error"
            modelErrors.push(`${MODEL_NAMES[modelId] || modelId}: ${errorMessage}`)
            // Continue with next test case
          }

          // Update progress even if there was an error
          completedSteps++
          setProgress(Math.round((completedSteps / totalSteps) * 100))
        }
      }

      // If we had model errors, add them to warnings
      if (modelErrors.length > 0) {
        setWarnings((prev) => [...prev, ...modelErrors])
      }

      setCompleted(true)
      setActiveTab("results")
      toast({
        title: "Experiment completed",
        description:
          modelErrors.length > 0
            ? "Evaluation completed with some errors. See warnings for details."
            : "All test cases have been evaluated successfully.",
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
      {hasDeprecatedModels && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Model Compatibility Notice</AlertTitle>
          <AlertDescription>
            Some models in this experiment are deprecated and will be replaced with supported alternatives.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="run">Run Experiment</TabsTrigger>
          <TabsTrigger value="results" disabled={!completed}>
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="run">
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
                  {detailedError && (
                    <div className="mt-2">
                      <details>
                        <summary className="cursor-pointer text-sm font-medium">Show detailed error</summary>
                        <pre className="mt-2 whitespace-pre-wrap text-xs bg-black/10 p-2 rounded">{detailedError}</pre>
                      </details>
                    </div>
                  )}
                </Alert>
              )}

              {warnings.length > 0 && (
                <Alert className="mb-4 bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <AlertTitle>Warnings</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1">
                      {warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
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
                  <p className="font-medium">Models to Evaluate:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {models.map((modelId) => (
                      <span key={modelId} className="bg-slate-100 px-2 py-1 rounded text-sm">
                        {MODEL_NAMES[modelId] || modelId}
                      </span>
                    ))}
                  </div>
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
                    <div className="text-sm text-muted-foreground">
                      <p>Model: {currentModel}</p>
                      {currentTestCase && <p>Evaluating: {currentTestCase.substring(0, 50)}...</p>}
                    </div>
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
        </TabsContent>

        <TabsContent value="results">
          {completed && <ResultsDashboardDirect experimentId={experiment.id} models={models} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
