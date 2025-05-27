"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const CATEGORIES = [
  "general knowledge",
  "science",
  "history",
  "geography",
  "medicine",
  "finance",
  "technology",
  "sports",
  "entertainment",
  "other",
]

export function NewTestCaseForm({ experimentId }: { experimentId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    input: "",
    expected_output: "",
    human_response: "",
    category: "general knowledge",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase environment variables are missing")
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/test_cases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          experiment_id: experimentId,
          input: formData.input,
          expected_output: formData.expected_output,
          human_response: formData.human_response,
          category: formData.category,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `API error: ${response.statusText}`)
      }

      toast({
        title: "Test case created",
        description: "Your new test case has been created successfully.",
      })

      // Redirect to test cases list
      router.push(`/experiments/${experimentId}/test-cases`)
    } catch (err) {
      console.error("Error saving test case:", err)
      setError(err instanceof Error ? err.message : "Failed to save test case. Please try again.")
      toast({
        title: "Error",
        description: "There was an error saving your test case. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>New Test Case</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="input">Input (Prompt/Query)</Label>
            <Textarea
              id="input"
              name="input"
              placeholder="Enter the prompt or query to send to the LLM"
              value={formData.input}
              onChange={handleChange}
              rows={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expected_output">Expected Output (Ground Truth)</Label>
            <Textarea
              id="expected_output"
              name="expected_output"
              placeholder="Enter the ground truth or desired factual response"
              value={formData.expected_output}
              onChange={handleChange}
              rows={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="human_response">Human Response</Label>
            <Textarea
              id="human_response"
              name="human_response"
              placeholder="Enter a human-generated response for baseline comparison"
              value={formData.human_response}
              onChange={handleChange}
              rows={3}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Create Test Case"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
