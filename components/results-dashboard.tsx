"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { HallucinationChart } from "@/components/hallucination-chart"
import { ComparisonChart } from "@/components/comparison-chart"

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

export function ResultsDashboard({ experimentId }: { experimentId: string }) {
  const [loading, setLoading] = useState(true)
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [comparisonStats, setComparisonStats] = useState<ComparisonStats>({
    llm: 0,
    human: 0,
    equal: 0,
    total: 0,
  })
  const supabase = createClient()

  useEffect(() => {
    async function fetchResults() {
      try {
        // First, get all test cases for this experiment
        const { data: testCases, error: testCasesError } = await supabase
          .from("test_cases")
          .select("id, category")
          .eq("experiment_id", experimentId)

        if (testCasesError) throw testCasesError

        if (!testCases || testCases.length === 0) {
          setLoading(false)
          return
        }

        // Get all evaluation results for these test cases
        const testCaseIds = testCases.map((tc) => tc.id)
        const { data: evaluationResults, error: evalError } = await supabase
          .from("evaluation_results")
          .select("test_case_id, factuality, closer_to_expected")
          .in("test_case_id", testCaseIds)

        if (evalError) throw evalError

        // Create a map of test case IDs to categories
        const testCaseCategories = new Map()
        testCases.forEach((tc) => {
          testCaseCategories.set(tc.id, tc.category)
        })

        // Calculate hallucination stats by category
        const categories: Record<string, { total: number; hallucinations: number }> = {}

        evaluationResults?.forEach((result) => {
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

        // Calculate LLM vs Human comparison stats
        const comparison = {
          llm: 0,
          human: 0,
          equal: 0,
          total: evaluationResults?.length || 0,
        }

        evaluationResults?.forEach((result) => {
          if (result.closer_to_expected === "LLM") {
            comparison.llm++
          } else if (result.closer_to_expected === "Human") {
            comparison.human++
          } else if (result.closer_to_expected === "Equal") {
            comparison.equal++
          }
        })

        setComparisonStats(comparison)
      } catch (error) {
        console.error("Error fetching results:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [experimentId])

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results Dashboard</CardTitle>
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
  )
}
