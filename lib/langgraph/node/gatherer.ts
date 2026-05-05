import { GraphState } from "../state";
import { vectorDbSearchTool, webSearchTool } from "../tools";

export async function gathererNode(state: GraphState): Promise<Partial<GraphState>> {
  const { research_plan, review_feedback } = state;

  let planToExecute = research_plan;

// The reviewer embeds extra queries in the feedback 
  if (review_feedback && review_feedback.includes("[MORE_DATA]")) {
    const extraQueries = extractExtraQueries(review_feedback);
    planToExecute = [...research_plan, ...extraQueries];
    console.log("🔄 Gatherer re-running with additional queries:", planToExecute);
  }

  // Split plan by tool type
  const vdbQueries = planToExecute
    .filter((q) => q.startsWith("[VDB]"))
    .map((q) => q.replace("[VDB] ", "").trim());

  const webQueries = planToExecute
    .filter((q) => q.startsWith("[WEB]"))
    .map((q) => q.replace("[WEB] ", "").trim());

  console.log(`🔍 Gatherer: ${vdbQueries.length} VDB queries, ${webQueries.length} web queries (parallel)`);

  // Build all promises — both tool types execute concurrently
  const vdbPromises = vdbQueries.map((query) =>
    vectorDbSearchTool.invoke({ query }).then((result) => {
      console.log(`  ✓ VDB: "${query}"`);
      return `[SOURCE: Vector DB | Query: "${query}"]\n${result}`;
    })
  );

  const webPromises = webQueries.map((query) =>
    webSearchTool.invoke({query}).then((result) => {
      console.log(`  ✓ WEB: "${query}"`);
      const text = typeof result === "string" ? result : JSON.stringify(result);
      return `[SOURCE: Web Search | Query: "${query}"]\n${text}`;
    })
  );

  // ALL tools fire simultaneously
  const allResults = await Promise.all([...vdbPromises, ...webPromises]);

  // Filter out empty/error-only results to avoid polluting the Writer's context
  const validResults = allResults.filter(
    (r) => r && !r.includes("No relevant chunks found") && r.trim().length > 50
  );

  console.log(`✅ Gatherer collected ${validResults.length} valid results`);

  return {
    // The reducer in state.ts APPENDS 
    gathered_data: validResults,
  };
}


function extractExtraQueries(feedback: string): string[] {
  const match = feedback.match(/\[MORE_DATA\]:(.*)/);
  if (!match) return [];
  return match[1]
    .split("||")
    .map((q) => q.trim())
    .filter(Boolean);
}