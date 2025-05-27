"use client"

import { useEffect } from "react"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

type ExperimentFormProps = {
  experiment?: {
    id: string
    name: string
    systemPrompt: string
    models: string[]
  }
}

// Updated list of currently supported Groq models
const AVAILABLE_MODELS = [
  { id: "llama3-70b-8192", name: "Llama 3 (70B)" },
  { id: "llama3-8b-8192", name: "Llama 3 (8B)" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
  { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
]

export function ExperimentForm({ experiment }: ExperimentFormProps = {}) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: experiment?.name || "",
    systemPrompt: experiment?.systemPrompt || "",
    models: experiment?.models || ["llama3-70b-8192"],
  })

  // Filter out any deprecated models from existing experiment
  useEffect(() => {
    if (experiment?.models) {
      const validModelIds = AVAILABLE_MODELS.map((model) => model.id)
      const filteredModels = experiment.models.filter((modelId) => validModelIds.includes(modelId))

      // If no valid models remain, default to Llama 3 70B
      if (filteredModels.length === 0) {
        setFormData((prev) => ({
          ...prev,
          models: ["llama3-70b-8192"],
        }))
      } else if (filteredModels.length !== experiment.models.length) {
        setFormData((prev) => ({
          ...prev,
          models: filteredModels,
        }))
      }
    }
  }, [experiment])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleModelToggle = (modelId: string) => {
    setFormData((prev) => {
      const models = prev.models.includes(modelId)
        ? prev.models.filter((id) => id !== modelId)
        : [...prev.models, modelId]

      // Ensure at least one model is selected
      return {
        ...prev,
        models: models.length > 0 ? models : prev.models,
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Check if we're in a development/preview environment
      const isDev = process.env.NODE_ENV === "development" || window.location.hostname.includes("vercel.app")

      if (isDev) {
        // In development, just simulate success
        console.log("Development mode: Simulating experiment creation")
        await new Promise((resolve) => setTimeout(resolve, 1000))

        toast({
          title: experiment ? "Experiment updated (Demo)" : "Experiment created (Demo)",
          description: `Your experiment has been ${experiment ? "updated" : "created"} successfully in demo mode.`,
        })

        router.push("/")
        return
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase environment variables are missing")
      }

      if (experiment?.id) {
        // Update existing experiment
        const response = await fetch(`${supabaseUrl}/rest/v1/experiments?id=eq.${experiment.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            name: formData.name,
            systemPrompt: formData.systemPrompt,
            models: formData.models,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API error: ${response.statusText}`)
        }

        toast({
          title: "Experiment updated",
          description: "Your experiment has been updated successfully.",
        })
      } else {
        // Create new experiment
        const response = await fetch(`${supabaseUrl}/rest/v1/experiments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            name: formData.name,
            systemPrompt: formData.systemPrompt,
            models: formData.models,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `API error: ${response.statusText}`)
        }

        toast({
          title: "Experiment created",
          description: "Your new experiment has been created successfully.",
        })
      }

      router.push("/")
      router.refresh()
    } catch (err) {
      console.error("Error saving experiment:", err)
      setError(err instanceof Error ? err.message : "Failed to save experiment. Please try again.")
      toast({
        title: "Error",
        description: "There was an error saving your experiment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Check if we're in a development/preview environment
  const isDev =
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" && window.location.hostname.includes("vercel.app"))

  return (
    <>
      {isDev && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Demo Mode</AlertTitle>
          <AlertDescription>
            The application is running in demo mode. Form submissions will be simulated.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{experiment ? "Edit Experiment" : "New Experiment"}</CardTitle>
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
              <Label htmlFor="name">Experiment Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter experiment name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                name="systemPrompt"
                placeholder="Enter the system prompt for the LLM"
                value={formData.systemPrompt}
                onChange={handleChange}
                rows={6}
                required
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                This is the instruction given to the LLM that will be used for all test cases in this experiment.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Models to Evaluate</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {AVAILABLE_MODELS.map((model) => (
                  <div key={model.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`model-${model.id}`}
                      checked={formData.models.includes(model.id)}
                      onCheckedChange={() => handleModelToggle(model.id)}
                      disabled={formData.models.length === 1 && formData.models.includes(model.id)}
                    />
                    <Label htmlFor={`model-${model.id}`} className="cursor-pointer">
                      {model.name}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Select at least one model to evaluate. Multiple models allow for comparison.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : experiment ? "Update Experiment" : "Create Experiment"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </>
  )
}
