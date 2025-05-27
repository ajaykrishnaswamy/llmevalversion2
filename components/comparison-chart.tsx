"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Card, CardContent } from "@/components/ui/card"

type ComparisonStats = {
  llm: number
  human: number
  equal: number
  total: number
}

export function ComparisonChart({ data }: { data: ComparisonStats }) {
  const chartData = [
    { name: "LLM Better", value: data.llm },
    { name: "Human Better", value: data.human },
    { name: "Equal", value: data.equal },
  ]

  const COLORS = ["#3b82f6", "#ef4444", "#22c55e"]

  if (data.total === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-center text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium">LLM vs Human Comparison</h3>
        <p className="text-sm text-muted-foreground">Comparing which responses were closer to the expected output</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [value, name]} itemStyle={{ color: "#000" }} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-4 mt-4 w-full max-w-md">
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-500">{data.llm}</p>
          <p className="text-sm text-muted-foreground">LLM Better</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-red-500">{data.human}</p>
          <p className="text-sm text-muted-foreground">Human Better</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-green-500">{data.equal}</p>
          <p className="text-sm text-muted-foreground">Equal</p>
        </div>
      </div>
    </div>
  )
}
