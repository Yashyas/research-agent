import { semanticSearch } from "@/lib/semanticSerch";
import { groq } from "@ai-sdk/groq";
import { streamText, stepCountIs, convertToModelMessages, UIMessage, tool } from "ai";
import { z } from "zod";


export async function POST(req: Request) {
  const { messages ,model = "openai/gpt-oss-20b"}: { messages: UIMessage[],model:string } = await req.json();

  const result = streamText({
    model: groq(model),
    messages: await convertToModelMessages(messages),
    tools: {
      getWeather: tool({
        description: "Get the current weather for a specific location. Use this to test tool calling.",
        title: "Fetch Weather",
        parameters: z.object({
          location: z.string().describe("The city and state, e.g., Patna, Bihar"),
        }),
        execute: async ({ location }) => {
          // Artificial delay (1.5s) to visibly test the "Executing: getWeather" UI state
          await new Promise((resolve) => setTimeout(resolve, 1500));
          
          // Generate a random dummy temperature
          const temp = Math.floor(Math.random() * 20) + 20; 
          
          return {
            location,
            temperature: `${temp}°C`,
            condition: "Partly Cloudy",
            status: "Testing successful"
          };
        },
      }),
      semanticSearch: tool({
    description:
      "Search through the private sources of user to find relevant information using vector similarity.",
      title:"Similarity Search",
    inputSchema: z.object({
      query: z.string().describe("The search query for finding related notes"),
    }),
    execute: async ({query}) => {
        const data = await semanticSearch(query)
        return data
    }
  }),
    },
    stopWhen: stepCountIs(5),
    system: `you are SmartNotes Agent - precise,context-aware note assistant.
    If the user asks for the weather, use the 'getWeather' tool with location 'spj'.
OPERATIONAL LOGIC:
    1. ALWAYS call 'semanticSearch' first for any query about user data except when asked for CRUD or ALL NOTES or WEB SEARCH.
    2. If the data exists in notes: Answer using that data.
    3. If the data DOES NOT exist in notes: 
       - Explicitly state: "I couldn't find this in your notes."
       - Then provide your own knowledge or through web search but prefix it with Source: "LLM" or "WEB".
    
    CRUD ACTIONS:
    - Use 'createNote' ONLY when the user explicitly asks to save/create .
    - Use 'updateNote' ONLY when the user explicitly asks to add or change an existing note (Never guess the id perform 'semanticSearch' for finding note and its ID).
    - Use 'fetchALLNotes' ONLY when user explicitly asks to summarize or extract data from all notes.

    WEB SEARCH:
    - Use 'webSearch' ONLY when user explicitly asks for current data, web search or the data is not available in database.
    `,
    onStepFinish({ reasoningText, toolCalls }) {
      console.log(`Reasoning: ${reasoningText}`);
      console.log(
        `Tools called: ${toolCalls.map((c) => c.toolName).join(", ")}`,
      );
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}