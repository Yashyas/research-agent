import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { GraphState } from "../state";

// ─────────────────────────────────────────────
// Zod schema for structured output from the Supervisor
// Forces the LLM to return a strict JSON object — no hallucinated routing
// ─────────────────────────────────────────────
const ResearchPlanSchema = z.object({
  vector_db_queries: z
    .array(z.string())
    .describe(
      "Specific queries to search in the internal vector database (PDFs, YouTube transcripts). " +
        "Break the user's question into targeted sub-questions."
    ),
  web_search_queries: z
    .array(z.string())
    .describe(
      "Queries for live web search. Use these for recent events, statistics, " +
        "documentation not in the knowledge base, or anything requiring up-to-date information."
    ),
  reasoning: z
    .string()
    .describe("Brief explanation of why you split the queries this way"),
});

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite-preview",
  temperature: 0,
}).withStructuredOutput(ResearchPlanSchema);

// ─────────────────────────────────────────────
// Supervisor Node
// ─────────────────────────────────────────────
export async function supervisorNode(state: GraphState): Promise<Partial<GraphState>> {
  const userMessage = state.messages[state.messages.length - 1];
  const userQuery =
    typeof userMessage.content === "string"
      ? userMessage.content
      : JSON.stringify(userMessage.content);

  const systemPrompt = `You are a Research Supervisor AI. Your job is to analyze a user's research question 
and decompose it into a precise, structured research plan.

You have access to two information sources:
1. **Internal Vector Database**: Contains embedded PDFs and YouTube transcripts that have been ingested. 
   Use this for domain-specific knowledge, course content, or documents the user has uploaded.
2. **Live Web Search**: Access to current web results via Tavily.
   Use this for recent news, public documentation, statistics, or anything not likely to be in the knowledge base.

Rules:
- Generate 2-4 targeted queries per source (do not over-query)
- Each query should be a standalone, specific search string — not a vague topic
- It's valid to have zero web queries if the question is purely about ingested documents
- It's valid to have zero vector queries if the question is entirely about live/recent information`;

  const plan = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(`Research question: ${userQuery}`),
  ]);

  // Flatten both query arrays into research_plan for the Gatherer to consume
  const researchPlan = [
    ...plan.vector_db_queries.map((q) => `[VDB] ${q}`),
    ...plan.web_search_queries.map((q) => `[WEB] ${q}`),
  ];

  console.log("✅ Supervisor created plan:", researchPlan);
  console.log("📋 Reasoning:", plan.reasoning);

  return {
    research_plan: researchPlan,
  };
}