import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { GraphState } from "../state";

const llm = new ChatGoogleGenerativeAI({
  model: "gemma-4-31b-it",
  temperature: 0.2, 
});

export async function writerNode(state: GraphState): Promise<Partial<GraphState>> {
  const { messages, gathered_data, draft_report, review_feedback, revision_count } = state;

  const userQuery =
    typeof messages[0].content === "string"
      ? messages[0].content
      : JSON.stringify(messages[0].content);

  const isRevision = review_feedback && revision_count > 0;

  const systemPrompt = `You are a STRICT, expert technical research writer. Your job is to produce a comprehensive, 
well-structured research report FROM "gathered_data" ONLY.
YOU SHOULD NOT USE YOUR TRAINING DATA FOR RESPONSES AND ONLY USE DATA GIVEN TO YOU.

STRICT RULES:
1. If "gathered_data" is not sufficient then simply answer "INSUFFICIENT DATA".
2. Structure the report with clear Markdown headings (##, ###) and use lists format of Markdown whenever something step-by-step is to be be shown, use Best practises of a Markdown report file along with bold texts for headings and sub-headings or topics.
3. Cite your sources inline using the tag format: [1] , [2] , etc.
4. If a source directly answers a point, quote briefly and cite it.
5. End with a ## Summary section that directly answers the user's question in 3-5 sentences.
6. If information is missing or contradictory, explicitly say so rather than guessing.
7. Add Sources section in a list format in the last of the report with their tag numbers and use this format: [Source[1]: Vector DB | Query: "..."] or [Source[2]: Web Search | URL: "..."] or [Source[3]: Web Search | URL: "..."] or [Source[4]: Vector DB | Query: "..."]
${
  isRevision
    ? `\n⚠️ REVISION REQUIRED: You are revising draft #${revision_count}. 
You MUST address every point in the reviewer's feedback below.
Do not simply restate the old draft — make substantive improvements.`
    : ""
}`;

  const sourceContext =
    gathered_data.length > 0
      ? gathered_data.join("\n\n" + "═".repeat(60) + "\n\n")
      : "No data was gathered. State this clearly in your report.";

  const humanPrompt = `
## User Research Question:
${userQuery}

## Source Data:
${sourceContext}

${
  isRevision
    ? `## Reviewer Feedback (MUST ADDRESS):
${review_feedback}

## Previous Draft (for reference — do NOT just copy):
${draft_report}`
    : ""
}

Write the research report now.`;

  console.log(
    `✍️  Writer generating ${isRevision ? `revision #${revision_count}` : "initial draft"}...`
  );

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(humanPrompt),
  ]);

  const draft =
    typeof response.content === "string"
      ? response.content
      : Array.isArray(response.content)
    ? response.content
        .filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("")
    : JSON.stringify(response.content);

  console.log(`✅ Writer produced draft (${draft.length} chars)`);

  return {
    draft_report: draft,
    revision_count: 1, // increments via reducer (existing + 1)
  };
}