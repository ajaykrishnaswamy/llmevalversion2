"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { HallucinationChart } from "@/components/hallucination-chart"
import { ComparisonChart } from "@/components/comparison-chart"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Info } from "lucide-react"
import { ModelComparisonChart } from "@/components/model-comparison-chart"

type CategoryStats = {
  category: string
  total: number
  hallucinations: number
  rate: number
}

type ComparisonStats = {
  llm: number
  human: number
  equal: number
  total: number
}

type ModelStats = {
  modelId: string
  modelName: string
  factualityRate: number
  humanWinRate: number
  totalEvaluated: number
  humanFactualityRate?: number
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

// Define deprecated models for warning display
const DEPRECATED_MODELS = ["mixtral-8x7b-32768", "gemma-7b-it"]

export function ResultsDashboardDirect({
  experimentId,
  models = ["llama3-70b-8192"],
}: { experimentId: string; models?: string[] }) {
  const [loading, setLoading] = useState(true)
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [comparisonStats, setComparisonStats] = useState<ComparisonStats>({
    llm: 0,
    human: 0,
    equal: 0,
    total: 0,
  })
  const [modelStats, setModelStats] = useState<ModelStats[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeModel, setActiveModel] = useState<string>(models[0])

  useEffect(() => {
    async function fetchResults() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Supabase environment variables are missing")
        }

        // First, get all test cases for this experiment
        const testCasesResponse = await fetch(
          `${supabaseUrl}/rest/v1/test_cases?experiment_id=eq.${experimentId}&select=id,category`,
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

        const testCases = await testCasesResponse.json()

        if (!testCases || testCases.length === 0) {
          setLoading(false)
          return
        }

        // Get all evaluation results for these test cases
        const testCaseIds = testCases.map((tc: any) => tc.id)
        const evalResultsResponse = await fetch(
          `${supabaseUrl}/rest/v1/evaluation_results?test_case_id=in.(${testCaseIds.join(",")})&select=test_case_id,model_id,factuality,human_factuality,closer_to_expected`,
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

        const evaluationResults = await evalResultsResponse.json()

        // Create a map of test case IDs to categories
        const testCaseCategories = new Map()
        testCases.forEach((tc: any) => {
          testCaseCategories.set(tc.id, tc.category)
        })

        // Get all unique model IDs from results
        const uniqueModelIds = new Set<string>()
        evaluationResults.forEach((result: any) => {
          uniqueModelIds.add(result.model_id || models[0])
        })

        // Process model comparison stats
        const modelStatsMap = new Map<
          string,
          {
            factual: number
            total: number
            humanWins: number
            llmWins: number
            equal: number
            humanFactual: number
          }
        >()

        // Initialize stats for each model
        Array.from(uniqueModelIds).forEach((modelId) => {
          modelStatsMap.set(modelId, {
            factual: 0,
            total: 0,
            humanWins: 0,
            llmWins: 0,
            equal: 0,
            humanFactual: 0,
          })
        })

        // Process evaluation results
        evaluationResults.forEach((result: any) => {
          const modelId = result.model_id || models[0]
          const stats = modelStatsMap.get(modelId)

          if (stats) {
            stats.total++
            if (result.factuality === true) {
              stats.factual++
            }

            if (result.human_factuality === true) {
              stats.humanFactual++
            }

            if (result.closer_to_expected === "Human") {
              stats.humanWins++
            } else if (result.closer_to_expected === "LLM") {
              stats.llmWins++
            } else {
              stats.equal++
            }
          }
        })

        // Convert to array for the chart
        const modelStatsArray = Array.from(modelStatsMap.entries()).map(([modelId, stats]) => ({
          modelId,
          modelName: MODEL_NAMES[modelId] || modelId,
          factualityRate: stats.total > 0 ? (stats.factual / stats.total) * 100 : 0,
          humanWinRate: stats.total > 0 ? (stats.humanWins / stats.total) * 100 : 0,
          totalEvaluated: stats.total,
          humanFactualityRate: stats.total > 0 ? (stats.humanFactual / stats.total) * 100 : 0,
        }))

        setModelStats(modelStatsArray)

        // If active model is not in results, use the first available model
        if (!uniqueModelIds.has(activeModel)) {
          const firstAvailableModel = Array.from(uniqueModelIds)[0]
          setActiveModel(firstAvailableModel)
        }

        // Filter results for the active model
        const activeModelResults = evaluationResults.filter(
          (result: any) => result.model_id === activeModel || (!result.model_id && activeModel === models[0]),
        )

        // Calculate hallucination stats by category for the active model
        const categories: Record<string, { total: number; hallucinations: number }> = {}

        activeModelResults.forEach((result: any) => {
          const category = testCaseCategories.get(result.test_case_id)

          if (!category) return

          if (!categories[category]) {
            categories[category] = { total: 0, hallucinations: 0 }
          }

          categories[category].total++

          if (result.factuality === false) {
            categories[category].hallucinations++
          }
        })

        const stats = Object.entries(categories).map(([category, stats]) => ({
          category,
          total: stats.total,
          hallucinations: stats.hallucinations,
          rate: stats.total > 0 ? (stats.hallucinations / stats.total) * 100 : 0,
        }))

        setCategoryStats(stats)

        // Calculate LLM vs Human comparison stats for the active model
        const comparison = {
          llm: 0,
          human: 0,
          equal: 0,
          total: activeModelResults.length,
        }

        activeModelResults.forEach((result: any) => {
          if (result.closer_to_expected === "LLM") {
            comparison.llm++
          } else if (result.closer_to_expected === "Human") {
            comparison.human++
          } else if (result.closer_to_expected === "Equal") {
            comparison.equal++
          }
        })

        setComparisonStats(comparison)
        setError(null)
      } catch (err) {
        console.error("Error fetching results:", err)
        setError(err instanceof Error ? err.message : "Failed to load results. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [experimentId, activeModel, models])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Results Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Results Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Check if we have any deprecated models in the results
  const hasDeprecatedModels = modelStats.some((model) => DEPRECATED_MODELS.includes(model.modelId))

  return (
    <div className="space-y-6">
      {hasDeprecatedModels && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Deprecated Models</AlertTitle>
          <AlertDescription>
            Some results are from deprecated models. These models are no longer available but their evaluation results
            are still shown.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Model Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ModelComparisonChart data={modelStats} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <CardTitle>Model-Specific Results</CardTitle>
          <div className="mt-2 sm:mt-0">
            <TabsList>
              {modelStats.map((model) => (
                <TabsTrigger
                  key={model.modelId}
                  value={model.modelId}
                  onClick={() => setActiveModel(model.modelId)}
                  className={activeModel === model.modelId ? "bg-primary text-primary-foreground" : ""}
                >
                  {model.modelName}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="hallucinations">
            <TabsList className="mb-4">
              <TabsTrigger value="hallucinations">Hallucination Rate by Category</TabsTrigger>
              <TabsTrigger value="comparison">LLM vs Human Comparison</TabsTrigger>
            </TabsList>
            <TabsContent value="hallucinations">
              <div className="h-[400px]">
                <HallucinationChart data={categoryStats} />
              </div>
            </TabsContent>
            <TabsContent value="comparison">
              <div className="h-[400px]">
                <ComparisonChart data={comparisonStats} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
