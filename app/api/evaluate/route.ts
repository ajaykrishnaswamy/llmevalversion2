import { NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

// Define currently supported models and fallbacks for deprecated models
const SUPPORTED_MODELS = {
  // Currently supported models
  "llama3-70b-8192": "llama3-70b-8192",
  "llama3-8b-8192": "llama3-8b-8192",
  "claude-3-haiku-20240307": "claude-3-haiku-20240307",
  "claude-3-opus-20240229": "claude-3-opus-20240229",
  "claude-3-sonnet-20240229": "claude-3-sonnet-20240229",

  // Fallbacks for deprecated models
  "mixtral-8x7b-32768": "llama3-70b-8192", // Fallback to Llama 3 70B
  "gemma-7b-it": "llama3-8b-8192", // Fallback to Llama 3 8B (similar size)
}

// Default model to use if requested model is not supported
const DEFAULT_MODEL = "llama3-70b-8192"

// Model to use for evaluations (should be the most capable)
const EVALUATION_MODEL = "llama3-70b-8192"

export async function POST(req: Request) {
  try {
    // Parse request body
    let requestBody
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.error("Error parsing request body:", parseError)
      return NextResponse.json({ error: "Invalid request body", details: "Could not parse JSON" }, { status: 400 })
    }

    const { system_prompt, input, expected_output, human_response, model_id } = requestBody

    // Validate required fields
    if (!input || !expected_output || !human_response) {
      return NextResponse.json(
        { error: "Missing required fields", details: "input, expected_output, and human_response are required" },
        { status: 400 },
      )
    }

    // Use the specified model or default
    const requestedModelId = model_id || DEFAULT_MODEL

    // Check if model is supported or needs a fallback
    const actualModelId = SUPPORTED_MODELS[requestedModelId] || DEFAULT_MODEL

    // Flag if we're using a fallback
    const usingFallback = requestedModelId !== actualModelId

    try {
      // Generate LLM response using Groq with the specified model
      console.log(`Generating response with model: ${actualModelId}`)
      const { text: llm_response } = await generateText({
        model: groq(actualModelId),
        prompt: input,
        system: system_prompt || "You are a helpful assistant.",
        maxTokens: 1024,
      })

      // Evaluate factuality of LLM response
      console.log("Evaluating LLM factuality")
      const llmFactualityPrompt = `
        You are an expert evaluator of language model outputs.
        
        Compare the following LLM response to the expected factual output and determine if the LLM response is factual.
        
        Expected factual output: "${expected_output}"
        
        LLM response: "${llm_response}"
        
        Is the LLM response factual? Answer with only "true" or "false".
      `

      const { text: llmFactualityResult } = await generateText({
        model: groq(EVALUATION_MODEL),
        prompt: llmFactualityPrompt,
      })

      const llmFactuality = llmFactualityResult.toLowerCase().includes("true")

      // Evaluate factuality of human response
      console.log("Evaluating human factuality")
      const humanFactualityPrompt = `
        You are an expert evaluator of human responses.
        
        Compare the following human response to the expected factual output and determine if the human response is factual.
        
        Expected factual output: "${expected_output}"
        
        Human response: "${human_response}"
        
        Is the human response factual? Answer with only "true" or "false".
      `

      const { text: humanFactualityResult } = await generateText({
        model: groq(EVALUATION_MODEL),
        prompt: humanFactualityPrompt,
      })

      const humanFactuality = humanFactualityResult.toLowerCase().includes("true")

      // Compare LLM response to human response
      console.log("Comparing LLM and human responses")
      const comparisonPrompt = `
        You are an expert evaluator of language model outputs.
        
        Compare the following LLM response and human response to the expected factual output.
        Determine which one is closer to the expected output in terms of factual accuracy.
        
        Expected factual output: "${expected_output}"
        
        LLM response: "${llm_response}"
        
        Human response: "${human_response}"
        
        Which response is closer to the expected output? Answer with only "LLM", "Human", or "Equal".
      `

      const { text: comparisonResult } = await generateText({
        model: groq(EVALUATION_MODEL),
        prompt: comparisonPrompt,
      })

      let closer_to_expected = "Equal"
      if (comparisonResult.includes("LLM")) {
        closer_to_expected = "LLM"
      } else if (comparisonResult.includes("Human")) {
        closer_to_expected = "Human"
      }

      // Generate explanation for LLM response
      console.log("Generating LLM explanation")
      const llmExplanationPrompt = `
        You are an expert evaluator of language model outputs.
        
        Compare the following LLM response to the expected factual output and explain why the LLM response is ${
          llmFactuality ? "factual" : "not factual"
        }.
        
        Expected factual output: "${expected_output}"
        
        LLM response: "${llm_response}"
        
        Provide a brief explanation (2-3 sentences) of your evaluation.
      `

      const { text: llmExplanation } = await generateText({
        model: groq(EVALUATION_MODEL),
        prompt: llmExplanationPrompt,
        maxTokens: 200,
      })

      // Generate explanation for human response
      console.log("Generating human explanation")
      const humanExplanationPrompt = `
        You are an expert evaluator of human responses.
        
        Compare the following human response to the expected factual output and explain why the human response is ${
          humanFactuality ? "factual" : "not factual"
        }.
        
        Expected factual output: "${expected_output}"
        
        Human response: "${human_response}"
        
        Provide a brief explanation (2-3 sentences) of your evaluation.
      `

      const { text: humanExplanation } = await generateText({
        model: groq(EVALUATION_MODEL),
        prompt: humanExplanationPrompt,
        maxTokens: 200,
      })

      console.log("Evaluation completed successfully")
      return NextResponse.json({
        model_id: requestedModelId, // Return the requested model ID for consistency
        actual_model_id: actualModelId, // Include the actual model used
        using_fallback: usingFallback,
        llm_response,
        llm_factuality: llmFactuality,
        human_factuality: humanFactuality,
        closer_to_expected,
        llm_explanation: llmExplanation,
        human_explanation: humanExplanation,
        factuality: llmFactuality, // For backward compatibility
        explanation: llmExplanation, // For backward compatibility
      })
    } catch (modelError) {
      console.error("Model error:", modelError)

      // If the model fails, try with the default model as a last resort
      if (actualModelId !== DEFAULT_MODEL) {
        console.warn(`Model ${actualModelId} failed, falling back to ${DEFAULT_MODEL}:`, modelError)

        try {
          const { text: llm_response } = await generateText({
            model: groq(DEFAULT_MODEL),
            prompt: input,
            system: system_prompt || "You are a helpful assistant.",
            maxTokens: 1024,
          })

          return NextResponse.json({
            model_id: requestedModelId,
            actual_model_id: DEFAULT_MODEL,
            using_fallback: true,
            fallback_reason: modelError instanceof Error ? modelError.message : "Model error",
            llm_response,
            llm_factuality: null, // Skip evaluation to save tokens
            human_factuality: null,
            closer_to_expected: null,
            llm_explanation: `Evaluation skipped due to model error: ${modelError instanceof Error ? modelError.message : "Unknown error"}`,
            human_explanation: null,
            factuality: null, // For backward compatibility
            explanation: `Evaluation skipped due to model error: ${modelError instanceof Error ? modelError.message : "Unknown error"}`, // For backward compatibility
          })
        } catch (fallbackError) {
          console.error("Fallback model error:", fallbackError)
          return NextResponse.json(
            {
              error: "Model error",
              message: "Both primary and fallback models failed",
              primaryError: modelError instanceof Error ? modelError.message : "Unknown error",
              fallbackError: fallbackError instanceof Error ? fallbackError.message : "Unknown error",
            },
            { status: 500 },
          )
        }
      }

      // If even the default model fails, return a detailed error
      return NextResponse.json(
        {
          error: "Model error",
          message: modelError instanceof Error ? modelError.message : "Unknown model error",
          stack: modelError instanceof Error ? modelError.stack : undefined,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in evaluation:", error)
    return NextResponse.json(
      {
        error: "Failed to evaluate",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
