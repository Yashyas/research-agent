import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

// --- Reviewer Decision Enum ---
export type ReviewDecision = "PASS" | "NEEDS_REVISION" | "NEEDS_MORE_DATA";

export const GraphAnnotation = Annotation.Root({
  // messages reducer
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // research_plan replace with latest plan
  research_plan: Annotation<string[]>({
    reducer: (_, update) => update, 
    default: () => [],
  }),

  // gathered_data 
  gathered_data: Annotation<string[]>({
    reducer: (existing, update) => [...existing, ...update],
    default: () => [],
  }),

  // Writer current output
  draft_report: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),

  // Reviewer feedback passed back to the Writer/Gatherer
  review_feedback: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),

  // routing signal from the Reviewer node
  review_decision: Annotation<ReviewDecision>({
    reducer: (_, update) => update,
    default: () => "NEEDS_REVISION",
  }),

  // failsafe to prevent infinite loops
  revision_count: Annotation<number>({
    reducer: (existing, update) => existing + update, // increment by passing 1
    default: () => 0,
  }),
});

export type GraphState = typeof GraphAnnotation.State;