"use client"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Create a singleton instance
let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    console.warn("Attempted to create Supabase client in a server context")
    // Return a mock client for SSR
    return {
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      }),
    } as any
  }

  if (!supabaseClient) {
    // Verify environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase environment variables are missing")
      throw new Error("Supabase environment variables are missing")
    }

    try {
      supabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey)
    } catch (error) {
      console.error("Failed to initialize Supabase client:", error)
      throw new Error("Failed to initialize Supabase client")
    }
  }

  return supabaseClient
}
