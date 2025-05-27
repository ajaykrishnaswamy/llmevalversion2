"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function DebugInfo() {
  const [showDebug, setShowDebug] = useState(false)

  if (!showDebug) {
    return (
      <div className="text-center mt-4">
        <Button variant="outline" size="sm" onClick={() => setShowDebug(true)}>
          Show Debug Info
        </Button>
      </div>
    )
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">Debug Information</CardTitle>
      </CardHeader>
      <CardContent className="text-xs">
        <div>
          <p>
            <strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Not set"}
          </p>
          <p>
            <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong>{" "}
            {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Not set"}
          </p>
          <p>
            <strong>Browser:</strong> {typeof window !== "undefined" ? window.navigator.userAgent : "SSR"}
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowDebug(false)} className="mt-2">
            Hide Debug Info
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
