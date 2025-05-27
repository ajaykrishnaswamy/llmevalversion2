"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, FileText, PlusCircle, Info } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

type TestCase = {
  id: string
  experiment_id: string
  input: string
  expected_output: string
  human_response: string
  category: string
  created_at: string
  evaluation_result?: {
    id: string
    llm_response: string
    factuality: boolean
    closer_to_expected: string
    explanation: string
  }
}

export function TestCaseListDirect({ experimentId }: { experimentId: string }) {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTestCases() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Supabase environment variables are missing")
        }

        // Fetch test cases
        const testCasesResponse = await fetch(
          `${supabaseUrl}/rest/v1/test_cases?experiment_id=eq.${experimentId}&order=created_at.desc`,
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
        const testCaseIds = testCasesData.map((tc: any) => tc.id)

        // Fetch evaluation results for these test cases
        const evalResultsResponse = await fetch(
          `${supabaseUrl}/rest/v1/evaluation_results?test_case_id=in.(${testCaseIds.join(",")})`,
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

        // Create a map of test case IDs to evaluation results
        const evalResultsMap = new Map()
        evalResultsData.forEach((result: any) => {
          evalResultsMap.set(result.test_case_id, result)
        })

        // Combine test cases with their evaluation results
        const combinedData = testCasesData.map((testCase: any) => ({
          ...testCase,
          evaluation_result: evalResultsMap.get(testCase.id) || null,
        }))

        setTestCases(combinedData)
        setError(null)
      } catch (err) {
        console.error("Error fetching test cases:", err)
        setError(err instanceof Error ? err.message : "Failed to load test cases. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchTestCases()
  }, [experimentId])

  async function deleteTestCase(id: string) {
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-1/4 mb-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
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
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold">No test cases yet</h3>
          <p className="text-muted-foreground">Create your first test case to start evaluating LLM responses.</p>
          <Link href={`/experiments/${experimentId}/test-cases/new`} className="mt-4">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Test Case
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Cases</CardTitle>
        <CardDescription>Manage test cases for this experiment</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Input</TableHead>
                <TableHead>Expected Output</TableHead>
                <TableHead>Human Response</TableHead>
                <TableHead>LLM Response</TableHead>
                <TableHead>Factuality</TableHead>
                <TableHead>Closer to Expected</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testCases.map((testCase) => (
                <TableRow key={testCase.id}>
                  <TableCell>
                    <Badge variant="outline">{testCase.category}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{testCase.input}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{testCase.expected_output}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{testCase.human_response}</TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {testCase.evaluation_result?.llm_response || "Not evaluated"}
                  </TableCell>
                  <TableCell>
                    {!testCase.evaluation_result ? (
                      "Not evaluated"
                    ) : testCase.evaluation_result.factuality ? (
                      <Badge className="bg-green-500">Factual</Badge>
                    ) : (
                      <Badge variant="destructive">Not Factual</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!testCase.evaluation_result ? (
                      "Not evaluated"
                    ) : (
                      <Badge variant="secondary">{testCase.evaluation_result.closer_to_expected}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {testCase.evaluation_result?.explanation && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon">
                                <Info className="h-4 w-4" />
                                <span className="sr-only">Explanation</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p>{testCase.evaluation_result.explanation}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Link href={`/experiments/${experimentId}/test-cases/${testCase.id}/edit`}>
                        <Button variant="outline" size="icon">
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </Link>
                      <Button variant="outline" size="icon" onClick={() => deleteTestCase(testCase.id)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
