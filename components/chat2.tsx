"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Send,
  BrainCircuit,
  Wrench,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  PenTool,
  CheckCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ThemeToggle } from "./theme-toggle";

// --- Existing Blocks ---
// (Keep your ReasoningBlock and ToolInvocationBlock exactly as they are)

function ReasoningBlock({ reasoning }: { reasoning: string }) { /* ... */ return null; }
function ToolInvocationBlock({ toolInvocation }: { toolInvocation: any }) { /* ... */ return null; }

// --- NEW: LangGraph Node Status Block ---
// Translates the raw nodeName into a user-friendly UI indicator
function NodeStatusBlock({ nodeName }: { nodeName: string }) {
  const getStatusConfig = () => {
    switch (nodeName) {
      case "supervisor":
        return { text: "Planning research strategy...", icon: <BrainCircuit className="h-4 w-4 animate-pulse text-blue-500" /> };
      case "gatherer":
        return { text: "Gathering data from sources...", icon: <Search className="h-4 w-4 animate-bounce text-purple-500" /> };
      case "writer":
        return { text: "Drafting the report...", icon: <PenTool className="h-4 w-4 animate-pulse text-emerald-500" /> };
      case "reviewer":
        return { text: "Reviewing for accuracy...", icon: <CheckCircle className="h-4 w-4 animate-pulse text-amber-500" /> };
      default:
        return { text: "Agent is processing...", icon: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-3 py-2 px-1">
      {config.icon}
      <span className="text-sm font-medium text-muted-foreground">
        {config.text}
      </span>
    </div>
  );
}

export default function ChatNew() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

  const isStreaming = status === "streaming" || status === "submitted";
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status]);

  const handleMessageSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <Card className="flex flex-col h-[95vh] lg:h-dvh w-full mx-auto shadow-lg border-muted">
      <div className="border-b bg-muted/20 p-4 flex justify-between">
        <h2 className="font-semibold text-lg tracking-tight flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          Research Workspace
        </h2>
        <ThemeToggle />
      </div>

      <ScrollArea className="flex-1 p-4 overflow-y-auto">
        <div className="flex flex-col gap-6 pb-4">
          {messages.map((m) => {
            // --- NEW: The "Clean UI" Logic ---
            // 1. Check if the final text has arrived yet
            const hasText = m.parts?.some(
              (p) => p.type === "text" && p.text.trim() !== ""
            );

            // 2. Extract all custom data parts to find the latest node status
            const customDataParts = m.parts?.filter((p) => p.type === "data-custom") || [];
            const latestNode = customDataParts.length > 0 
                ? (customDataParts[customDataParts.length - 1] as any).data?.node 
                : null;

            return (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role !== "user" && (
                  <Avatar className="h-8 w-8 mt-1 border">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      AI
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`flex flex-col max-w-[85%] ${m.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`rounded-xl px-4 py-3 ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background border shadow-sm w-full"
                    }`}
                  >
                    
                    {/* HIDER: If we are waiting for the agent and have no text, show the node status */}
                    {m.role === "assistant" && !hasText && latestNode && (
                      <NodeStatusBlock nodeName={latestNode} />
                    )}

                    {/* REVEAL: Map over parts as normal, but ignore custom data here to keep UI clean */}
                    {m.parts?.map((part, index) => {
                      if (part.type.startsWith("tool-")) {
                        return <ToolInvocationBlock key={index} toolInvocation={part} />;
                      }
                      
                      switch (part.type) {
                        case "text":
                          // Only render text if there's actual content (prevents empty bubbles)
                          if (!part.text.trim()) return null;
                          return (
                            <div key={index} className="whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown>{part.text}</ReactMarkdown>
                            </div>
                          );
                        case "reasoning":
                          return <ReasoningBlock key={index} reasoning={part.text} />;
                        default:
                          return null;
                      }
                    })}
                  </div>
                </div>

                {m.role === "user" && (
                  <Avatar className="h-8 w-8 mt-1 border">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                      You
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}

          {/* Generic fallback thinking state if the stream just started and no node is active yet */}
          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3 justify-start items-center text-muted-foreground text-sm">
              <Avatar className="h-8 w-8 border">
                <AvatarFallback className="bg-background text-foreground text-xs">
                  AI
                </AvatarFallback>
              </Avatar>
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          <div ref={scrollEndRef} className="h-px w-full" />
        </div>
      </ScrollArea>

      <form onSubmit={handleMessageSend} className="p-4 border-t bg-muted/20 flex gap-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the agent to perform a task..."
          className="flex-1 bg-background"
          disabled={isStreaming}
        />
        <Button
          type="submit"
          disabled={isStreaming || !input.trim()}
          size="icon"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </Card>
  );
}