"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent } from "@/components/ui/card"

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
  human: "Human Response",
}

export function ModelComparisonChart({ data }: { data: ModelStats[] }) {
  // Add human data if available
  const humanData = data.find((model) => model.humanFactualityRate !== undefined)
  const dataWithHuman = [...data]

  if (humanData && humanData.humanFactualityRate !== undefined) {
    dataWithHuman.push({
      modelId: "human",
      modelName: "Human Response",
      factualityRate: humanData.humanFactualityRate,
      humanWinRate: 0, // Not applicable
      totalEvaluated: humanData.totalEvaluated,
    })
  }

  // Sort data by factuality rate in descending order
  const sortedData = [...dataWithHuman].sort((a, b) => b.factualityRate - a.factualityRate)

  if (data.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-center text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  // Transform data for the chart
  const chartData = sortedData.map((model) => ({
    name: model.modelName || MODEL_NAMES[model.modelId] || model.modelId,
    "Factuality Rate": Number.parseFloat(model.factualityRate.toFixed(1)),
    "Human Win Rate": model.modelId !== "human" ? Number.parseFloat(model.humanWinRate.toFixed(1)) : 0,
    "LLM Win Rate":
      model.modelId !== "human"
        ? Number.parseFloat((100 - model.humanWinRate - (100 - model.factualityRate - model.humanWinRate)).toFixed(1))
        : 0,
    totalEvaluated: model.totalEvaluated,
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 70,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
        <YAxis label={{ value: "Percentage (%)", angle: -90, position: "insideLeft" }} domain={[0, 100]} />
        <Tooltip formatter={(value, name) => [`${value}%`, name]} labelFormatter={(label) => `Model: ${label}`} />
        <Legend />
        <Bar dataKey="Factuality Rate" name="Factuality Rate" fill="#22c55e" />
        <Bar dataKey="Human Win Rate" name="Human Win Rate" fill="#ef4444" />
        <Bar dataKey="LLM Win Rate" name="LLM Win Rate" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  )
}
