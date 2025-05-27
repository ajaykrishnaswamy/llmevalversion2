"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type TestCase = {
  id: string
  experiment_id: string
  input: string
  expected_output: string
  human_response: string
  category: string
  created_at: string
}

type EvaluationResult = {
  id: string
  test_case_id: string
  model_id: string
  llm_response: string
  factuality: boolean
  human_factuality: boolean
  closer_to_expected: string
  explanation: string
  human_explanation: string
}

// Updated model names with current and deprecated models
const MODEL_NAMES: Record<string, string> = {
  "llama3-70b-8192": "Llama 3 (70B)",
  "llama3-8b-8192": "Llama 3 (8B)",
  "claude-3-haiku-20240307": "Claude 3 Haiku",
  "claude-3-opus-20240229": "Claude 3 Opus",
  "claude-3-sonnet-20240229": "Claude 3 Sonnet",
  // Deprecated models (kept for historical data)
  "mixtral-8x7b-32768": "Mixtral 8x7B",
  "gemma-7b-it": "Gemma 7B",
}

export function ComparisonTable({ experimentId }: { experimentId: string }) {
  const [testCases, setTestCases] = useState<(TestCase & { results: Record<string, EvaluationResult> })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modelIds, setModelIds] = useState<string[]>([])
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function fetchData() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Supabase environment variables are missing")
        }

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

        if (testCasesData.length === 0) {
          setTestCases([])
          setLoading(false)
          return
        }

        // Get all test case IDs
        const testCaseIds = testCasesData.map((tc: TestCase) => tc.id)

        // Fetch evaluation results
        const evalResultsResponse = await fetch(
          `${supabaseUrl}/rest/v1/evaluation_results?test_case_id=in.(${testCaseIds.join(",")})&select=*`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          },
        )

        if (!evalResultsResponse.ok) {
          throw new Error(`API error: ${evalResultsResponse.statusText}`)
        }

        const evalResultsData = await evalResultsResponse.json()

        // Get unique model IDs
        const uniqueModelIds = Array.from(new Set(evalResultsData.map((result: EvaluationResult) => result.model_id)))
        setModelIds(uniqueModelIds)

        // Organize results by test case
        const testCasesWithResults = testCasesData.map((testCase: TestCase) => {
          const results: Record<string, EvaluationResult> = {}

          evalResultsData
            .filter((result: EvaluationResult) => result.test_case_id === testCase.id)
            .forEach((result: EvaluationResult) => {
              results[result.model_id] = result
            })

          return {
            ...testCase,
            results,
          }
        })

        setTestCases(testCasesWithResults)
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

  const toggleRowExpansion = (testCaseId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [testCaseId]: !prev[testCaseId],
    }))
  }

  const deleteTestCase = async (id: string) => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase environment variables are missing")
      }

      // First delete any evaluation results for this test case
      const evalDeleteResponse = await fetch(`${supabaseUrl}/rest/v1/evaluation_results?test_case_id=eq.${id}`, {
        method: "DELETE",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      })

      if (!evalDeleteResponse.ok) {
        throw new Error(`API error: ${evalDeleteResponse.statusText}`)
      }

      // Then delete the test case
      const testCaseDeleteResponse = await fetch(`${supabaseUrl}/rest/v1/test_cases?id=eq.${id}`, {
        method: "DELETE",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      })

      if (!testCaseDeleteResponse.ok) {
        throw new Error(`API error: ${testCaseDeleteResponse.statusText}`)
      }

      // Update the UI
      setTestCases(testCases.filter((tc) => tc.id !== id))
      setError(null)
    } catch (err) {
      console.error("Error deleting test case:", err)
      setError(err instanceof Error ? err.message : "Failed to delete test case. Please try again.")
    }
  }

  // Helper function to get human factuality from any model result
  const getHumanFactuality = (testCase: TestCase & { results: Record<string, EvaluationResult> }) => {
    // Get the first model result that has human factuality
    const modelId = Object.keys(testCase.results)[0]
    if (modelId && testCase.results[modelId]) {
      return testCase.results[modelId].human_factuality
    }
    return null
  }

  // Helper function to get human explanation from any model result
  const getHumanExplanation = (testCase: TestCase & { results: Record<string, EvaluationResult> }) => {
    // Get the first model result that has human explanation
    const modelId = Object.keys(testCase.results)[0]
    if (modelId && testCase.results[modelId]) {
      return testCase.results[modelId].human_explanation
    }
    return null
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (testCases.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Test Cases</AlertTitle>
        <AlertDescription>No test cases found for this experiment.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table className="border">
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[200px]">Test Case</TableHead>
            <TableHead className="w-[150px]">Expected Output</TableHead>
            <TableHead className="w-[150px]">Human Response</TableHead>
            {modelIds.map((modelId) => (
              <TableHead key={modelId} className="w-[150px]">
                {MODEL_NAMES[modelId] || modelId}
              </TableHead>
            ))}
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {testCases.map((testCase) => (
            <React.Fragment key={testCase.id}>
              <TableRow className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleRowExpansion(testCase.id)}
                    >
                      {expandedRows[testCase.id] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <span className="truncate max-w-[150px]" title={testCase.input}>
                      {testCase.input}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="truncate max-w-[150px]" title={testCase.expected_output}>
                  {testCase.expected_output}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="truncate max-w-[150px]" title={testCase.human_response}>
                      {testCase.human_response}
                    </div>
                    {getHumanFactuality(testCase) !== null && (
                      <Badge
                        className={
                          getHumanFactuality(testCase)
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-red-500 hover:bg-red-600"
                        }
                      >
                        {getHumanFactuality(testCase) ? "Factual" : "Not Factual"}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {modelIds.map((modelId) => (
                  <TableCell key={modelId}>
                    {testCase.results[modelId] ? (
                      <div className="flex flex-col gap-1">
                        <div className="truncate max-w-[150px]" title={testCase.results[modelId]?.llm_response}>
                          {testCase.results[modelId]?.llm_response}
                        </div>
                        <Badge
                          className={
                            testCase.results[modelId]?.factuality
                              ? "bg-green-500 hover:bg-green-600"
                              : "bg-red-500 hover:bg-red-600"
                          }
                        >
                          {testCase.results[modelId]?.factuality ? "Factual" : "Not Factual"}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Not evaluated</span>
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/experiments/${experimentId}/test-cases/${testCase.id}/edit`}>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => deleteTestCase(testCase.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {expandedRows[testCase.id] && (
                <TableRow>
                  <TableCell colSpan={modelIds.length + 4} className="bg-muted/20 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Test Case Details</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium">Category:</span> {testCase.category}
                          </div>
                          <div>
                            <span className="font-medium">Input:</span>
                            <div className="mt-1 p-2 bg-muted rounded-md whitespace-pre-wrap">{testCase.input}</div>
                          </div>
                          <div>
                            <span className="font-medium">Expected Output:</span>
                            <div className="mt-1 p-2 bg-muted rounded-md whitespace-pre-wrap">
                              {testCase.expected_output}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Human Response:</span>
                            <div className="flex items-center justify-between">
                              {getHumanFactuality(testCase) !== null && (
                                <Badge
                                  className={
                                    getHumanFactuality(testCase)
                                      ? "bg-green-500 hover:bg-green-600"
                                      : "bg-red-500 hover:bg-red-600"
                                  }
                                >
                                  {getHumanFactuality(testCase) ? "Factual" : "Not Factual"}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 p-2 bg-muted rounded-md whitespace-pre-wrap">
                              {testCase.human_response}
                            </div>
                            {getHumanExplanation(testCase) && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                <span className="font-medium">Evaluation:</span> {getHumanExplanation(testCase)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Model Responses</h4>
                        <div className="space-y-4">
                          {modelIds.map((modelId) => (
                            <div key={modelId}>
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{MODEL_NAMES[modelId] || modelId}:</span>
                                {testCase.results[modelId] && (
                                  <Badge
                                    className={
                                      testCase.results[modelId]?.factuality
                                        ? "bg-green-500 hover:bg-green-600"
                                        : "bg-red-500 hover:bg-red-600"
                                    }
                                  >
                                    {testCase.results[modelId]?.factuality ? "Factual" : "Not Factual"}
                                  </Badge>
                                )}
                              </div>
                              {testCase.results[modelId] ? (
                                <>
                                  <div className="mt-1 p-2 bg-muted rounded-md whitespace-pre-wrap">
                                    {testCase.results[modelId]?.llm_response}
                                  </div>
                                  {testCase.results[modelId]?.explanation && (
                                    <div className="mt-2 text-sm text-muted-foreground">
                                      <span className="font-medium">Evaluation:</span>{" "}
                                      {testCase.results[modelId]?.explanation}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="mt-1 p-2 bg-muted rounded-md text-muted-foreground italic">
                                  Not evaluated
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
