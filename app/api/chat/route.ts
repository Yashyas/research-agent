// app/api/chat/route.ts
import { toBaseMessages, toUIMessageStream } from "@ai-sdk/langchain";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  UIMessage,
} from "ai";
import { researchGraph } from "@/lib/langgraph/graph";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const langchainMessages = await toBaseMessages(messages);
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });

      writer.write({
        type: "data-custom",
        data: { node: "supervisor" },
      });

      const eventStream = await researchGraph.stream(
        { messages: langchainMessages },
        { streamMode: ["updates"] },
      );

      let finalReport = "";
      let lastDecision = "";
      let currentLoop = 0;

      for await (const update of eventStream) {
        const payload = update[1];
        const nodeName = Object.keys(payload)[0] as keyof typeof payload;
        const updatePackets = payload[nodeName];

        let currentlyActiveNode = nodeName;

        if (nodeName === "supervisor") currentlyActiveNode = "gatherer";
        else if (nodeName === "gatherer") currentlyActiveNode = "writer";
        else if (nodeName === "writer") currentlyActiveNode = "reviewer";
        else if (nodeName === "reviewer") {
          // If the reviewer finished, look at its decision to see where it went next
          if (updatePackets?.review_decision === "NEEDS_MORE_DATA") {
            currentlyActiveNode = "gatherer";
          } else if (updatePackets?.review_decision === "NEEDS_REVISION") {
            currentlyActiveNode = "writer";
          }
          // If it's "PASS", we don't need to update it because the loop will end anyway
        }

        if (updatePackets?.draft_report)
          finalReport = updatePackets.draft_report;
        if (updatePackets?.review_decision)
          lastDecision = updatePackets.review_decision;
        if (updatePackets?.revision_count !== undefined)
          currentLoop += updatePackets.revision_count;

        writer.write({
          type: "data-custom",
          data: { node: currentlyActiveNode },
        });
      }
      console.log(lastDecision);
      console.log(currentLoop);
      console.log(finalReport.length);

      writer.write({ type: "text-start", id: "t1" });
      if (lastDecision === "PASS" || currentLoop >= 3) {
        writer.write({ type: "text-delta", id: "t1", delta: finalReport });
      } else {
        writer.write({
          type: "text-delta",
          delta: finalReport || "Unexpected Error",
          id: "final-report",
        });
      }
      writer.write({ type: "text-end", id: "t1" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({
    stream: stream,
  });
}
