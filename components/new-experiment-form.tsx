"use client"

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

export function NewExperimentForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    systemPrompt: "",
    mistral: true,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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

        // Simulate a delay
        await new Promise((resolve) => setTimeout(resolve, 1000))

        toast({
          title: "Experiment created (Demo)",
          description: "Your new experiment has been created successfully in demo mode.",
        })

        // Redirect to experiments list
        router.push("/")
        return
      }

      // Direct fetch to Supabase API
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase environment variables are missing")
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

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
          mistral: formData.mistral,
          meta: false,
          google: false,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `API error: ${response.statusText}`)
      }

      toast({
        title: "Experiment created",
        description: "Your new experiment has been created successfully.",
      })

      // Redirect to experiments list
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
            <CardTitle>New Experiment</CardTitle>
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
                disabled={!!error}
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
                disabled={!!error}
              />
              <p className="text-sm text-muted-foreground">
                This is the instruction given to the LLM that will be used for all test cases in this experiment.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !!error}>
              {loading ? "Saving..." : "Create Experiment"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Debug Information */}
      <div className="mt-6">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => setShowDebug(!showDebug)}
        >
          <Info className="h-4 w-4" />
          {showDebug ? "Hide Debug Info" : "Show Debug Info"}
        </Button>

        {showDebug && (
          <Card className="mt-2">
            <CardContent className="pt-4">
              <h3 className="font-medium mb-2">Environment Information</h3>
              <div className="bg-slate-100 p-2 rounded text-xs overflow-auto">
                <p>
                  <strong>NODE_ENV:</strong> {process.env.NODE_ENV || "Not set"}
                </p>
                <p>
                  <strong>Is Development/Preview:</strong> {isDev ? "Yes" : "No"}
                </p>
                <p>
                  <strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Not set"}
                </p>
                <p>
                  <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong>{" "}
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set"}
                </p>
              </div>

              <h3 className="font-medium mt-4 mb-2">Browser Information</h3>
              <pre className="bg-slate-100 p-2 rounded text-xs overflow-auto">
                {typeof window !== "undefined" ? window.navigator.userAgent : "Server-side rendering"}
              </pre>

              <h3 className="font-medium mt-4 mb-2">Hostname</h3>
              <pre className="bg-slate-100 p-2 rounded text-xs overflow-auto">
                {typeof window !== "undefined" ? window.location.hostname : "Server-side rendering"}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
