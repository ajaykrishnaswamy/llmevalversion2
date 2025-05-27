"use client"
import { Card, CardContent } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"

type CategoryStats = {
  category: string
  total: number
  hallucinations: number
  rate: number
}

export function HallucinationChart({ data }: { data: CategoryStats[] }) {
  // Sort data by hallucination rate in descending order
  const sortedData = [...data].sort((a, b) => b.rate - a.rate)

  if (data.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-center text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={sortedData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 70,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="category" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
        <YAxis label={{ value: "Hallucination Rate (%)", angle: -90, position: "insideLeft" }} domain={[0, 100]} />
        <Tooltip
          formatter={(value, name) => [`${value.toFixed(1)}%`, "Hallucination Rate"]}
          labelFormatter={(label) => `Category: ${label}`}
        />
        <Legend />
        <Bar dataKey="rate" name="Hallucination Rate" fill="#ef4444">
          {sortedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.rate > 50 ? "#ef4444" : entry.rate > 25 ? "#f97316" : "#22c55e"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
