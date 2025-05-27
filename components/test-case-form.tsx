"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type TestCaseFormProps = {
  experimentId: string
  testCase?: {
    id: string
    input: string
    expected_output: string
    human_response: string
    category: string
  }
}

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

export function TestCaseForm({ experimentId, testCase }: TestCaseFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    input: testCase?.input || "",
    expected_output: testCase?.expected_output || "",
    human_response: testCase?.human_response || "",
    category: testCase?.category || "general knowledge",
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

    try {
      if (testCase?.id) {
        // Update existing test case
        const { error } = await supabase
          .from("test_cases")
          .update({
            input: formData.input,
            expected_output: formData.expected_output,
            human_response: formData.human_response,
            category: formData.category,
          })
          .eq("id", testCase.id)

        if (error) throw error

        toast({
          title: "Test case updated",
          description: "Your test case has been updated successfully.",
        })
      } else {
        // Create new test case
        const { error } = await supabase.from("test_cases").insert({
          experiment_id: experimentId,
          input: formData.input,
          expected_output: formData.expected_output,
          human_response: formData.human_response,
          category: formData.category,
        })

        if (error) throw error

        toast({
          title: "Test case created",
          description: "Your new test case has been created successfully.",
        })
      }

      // Redirect to test cases list
      router.push(`/experiments/${experimentId}/test-cases`)
      router.refresh()
    } catch (error) {
      console.error("Error saving test case:", error)
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
          <CardTitle>{testCase ? "Edit Test Case" : "New Test Case"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            {loading ? "Saving..." : testCase ? "Update Test Case" : "Create Test Case"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
