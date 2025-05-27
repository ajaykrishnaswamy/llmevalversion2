"use client"

// Check if required environment variables are available
export function checkEnvironmentVariables() {
  const missingVars = []

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missingVars.push("NEXT_PUBLIC_SUPABASE_URL")
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missingVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
    isDev:
      process.env.NODE_ENV === "development" ||
      (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")),
  }
}

// Get environment variable values for debugging
export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV || "Not set",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Not set",
    hasAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set",
    hostname: typeof window !== "undefined" ? window.location.hostname : "Server-side rendering",
    isDev:
      process.env.NODE_ENV === "development" ||
      (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")),
  }
}
