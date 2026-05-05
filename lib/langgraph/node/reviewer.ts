import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { GraphState, ReviewDecision } from "../state";

const ReviewSchema = z.object({
  decision: z
    .enum(["PASS", "NEEDS_REVISION", "NEEDS_MORE_DATA"])
    .describe(
      "PASS: report is high quality and complete. " +
        "NEEDS_REVISION: data is sufficient but writing/structure needs improvement. " +
        "NEEDS_MORE_DATA: the report is missing key information that wasn't gathered."
    ),
  feedback: z
    .string()
    .describe(
      "Specific, actionable feedback based on your decision:\n\n" +

        "For NEEDS_MORE_DATA: You MUST use this exact format:\n" +
        "[MORE_DATA]: <tag> query one || <tag> query two || <tag> query three\n\n" +
        "Where <tag> is STRICTLY either [VDB] or [WEB] — nothing else is valid.\n" +
        "Use [VDB] when the missing info is likely in ingested documents (course material, uploaded PDFs, YouTube transcripts).\n" +
        "Use [WEB] when the missing info requires live, recent, or external web knowledge.\n" +
        "Every single query MUST be prefixed with either [VDB] or [WEB]. No bare queries allowed.\n\n" +
        "Example: '[MORE_DATA]: [VDB] transformer self-attention mechanism || [WEB] transformer benchmark results 2024 || [VDB] positional encoding explained'\n\n" +

        "For NEEDS_REVISION: List exactly what must be rewritten, restructured, or clarified in the existing draft. " +
        "Be specific — point to sections, not vague issues.\n\n" +

        "For PASS: Brief explanation of why the report fully meets quality standards."
    ),
  quality_score: z
    .number()
    .min(1)
    .max(10)
    .describe("Overall quality score from 1-10"),
});

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite-preview",
  temperature: 0,
}).withStructuredOutput(ReviewSchema);

export async function reviewerNode(state: GraphState): Promise<Partial<GraphState>> {
  const { messages, gathered_data, draft_report, revision_count } = state;

  const userQuery =
    typeof messages[0].content === "string"
      ? messages[0].content
      : JSON.stringify(messages[0].content);

  const systemPrompt = `You are a rigorous Quality Assurance Reviewer for research reports.
Evaluate the draft report against these strict criteria:

EVALUATION CRITERIA:
1. **Factual Grounding**: Every claim must be supported by the provided source data. Zero hallucinations allowed.
2. **Completeness**: Does the report fully answer the user's question? Are there obvious gaps?
3. **Structure**: Clear Markdown formatting, proper headings, logical flow.
4. **Citations**: Are sources cited inline? Is it clear where information came from?
5. **Summary**: Does the ## Summary directly and concisely answer the user's question?

DECISION RULES:
- **PASS**: Score ≥ 7, all criteria adequately met, question fully answered.
- **NEEDS_REVISION**: Score 4-6, data is present but writing/structure/citations need work.
  The gathered data is sufficient — the writer just needs to do better.
- **NEEDS_MORE_DATA**: Score < 4 OR critical information is genuinely absent from the sources.
  Only use this if re-gathering would actually help.

CRITICAL RULE FOR NEEDS_MORE_DATA:
When you decide NEEDS_MORE_DATA, your feedback field MUST follow this format exactly:
[MORE_DATA]: [VDB] or [WEB] prefixed queries separated by ||

You must choose [VDB] or [WEB] for EVERY query:
- [VDB] = search the internal vector database (ingested PDFs, YouTube transcripts, course material)
- [WEB] = search the live web (recent news, public docs, statistics, anything external)

NEVER write a bare query without a [VDB] or [WEB] prefix. The downstream system cannot route untagged queries.

Example of correct NEEDS_MORE_DATA feedback:
"[MORE_DATA]: [VDB] attention mechanism in transformers || [WEB] GPT-4 benchmark scores 2024 || [VDB] BERT pre-training objective"

Be strict but fair. Do NOT pass a mediocre report.`;

  const humanPrompt = `## Original User Question:
${userQuery}

## Source Data Available (${gathered_data.length} chunks):
${gathered_data.slice(0, 10).join("\n\n---\n\n")}
${gathered_data.length > 10 ? `\n[...${gathered_data.length - 10} more chunks truncated for review...]` : ""}

## Draft Report to Review (revision #${revision_count}):
${draft_report}

Evaluate this report now.`;

  console.log(`🔍 Reviewer evaluating draft #${revision_count}...`);

  const review = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(humanPrompt),
  ]);

  //safety net for times when llm doesnt tag them
  if (review.decision === "NEEDS_MORE_DATA") {
    const hasMoreDataTag = review.feedback.includes("[MORE_DATA]:");
    const hasPrefixedQueries =
      review.feedback.includes("[VDB]") || review.feedback.includes("[WEB]");

    if (!hasMoreDataTag || !hasPrefixedQueries) {
      console.warn(
        "⚠️  Reviewer returned NEEDS_MORE_DATA but feedback is missing " +
          "[MORE_DATA]: or [VDB]/[WEB] tags. Downgrading to NEEDS_REVISION."
      );
      console.warn("   Raw feedback was:", review.feedback);

      return {
        review_decision: "NEEDS_REVISION" as ReviewDecision,
        review_feedback:
          "The report needs improvement. Ensure all claims are well-supported, " +
          "properly cited, and the summary directly answers the user's question.\n\n" +
          `Original reviewer note: ${review.feedback}`,
      };
    }
  }

  console.log(`✅ Reviewer decision: ${review.decision} (score: ${review.quality_score}/10)`);
  console.log(`📝 Feedback: ${review.feedback}`);

  return {
    review_decision: review.decision as ReviewDecision,
    review_feedback: review.feedback,
  };
}