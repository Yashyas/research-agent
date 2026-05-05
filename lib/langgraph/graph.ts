import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphAnnotation, GraphState } from "./state";
import { supervisorNode } from "./node/supervisor";
import { gathererNode } from "./node/gatherer";
import { writerNode } from "./node/writer";
import { reviewerNode } from "./node/reviewer";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const MAX_REVISIONS = 3; // failsafe: prevents infinite LLM cost loops

// ─────────────────────────────────────────────
// Conditional Edge: Routes from Reviewer
//
// Reads `review_decision` and `revision_count` from state.
// Returns the name of the next node as a string.
// ─────────────────────────────────────────────
function routeFromReviewer(state: GraphState): string {
  const { review_decision, revision_count } = state;

  // Failsafe: hard stop after max revisions regardless of decision
  if (revision_count >= MAX_REVISIONS) {
    console.log(
      `⚠️  Max revisions (${MAX_REVISIONS}) reached. Forcing END with current draft.`
    );
    return END;
  }

  switch (review_decision) {
    case "PASS":
      console.log("🎉 Reviewer: PASS → END");
      return END;

    case "NEEDS_REVISION":
      console.log("🔁 Reviewer: NEEDS_REVISION → writer");
      return "writer";

    case "NEEDS_MORE_DATA":
      console.log("🔁 Reviewer: NEEDS_MORE_DATA → gatherer");
      return "gatherer";

    default:
      console.log("⚠️  Unknown decision, forcing END");
      return END;
  }
}

// ─────────────────────────────────────────────
// Build and Compile the Graph
// ─────────────────────────────────────────────
function buildResearchGraph() {
  const graph = new StateGraph(GraphAnnotation)
    // Register nodes
    .addNode("supervisor", supervisorNode)
    .addNode("gatherer", gathererNode)
    .addNode("writer", writerNode)
    .addNode("reviewer", reviewerNode)

    // Static edges (always go this direction)
    .addEdge(START, "supervisor")
    .addEdge("supervisor", "gatherer")
    .addEdge("gatherer", "writer")
    .addEdge("writer", "reviewer")

    // Conditional edge: reviewer routes to writer, gatherer, or END
    .addConditionalEdges("reviewer", routeFromReviewer, {
      writer: "writer",
      gatherer: "gatherer",
      [END]: END,
    });

  return graph.compile();
}

// Export a single compiled graph instance (singleton)
export const researchGraph = buildResearchGraph();

// Export the type for use in the API route
export type { GraphState };