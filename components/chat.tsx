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
} from "lucide-react";
import ReactMarkdown from "react-markdown"

// Displays the model's internal reasoning/thinking steps
function ReasoningBlock({ reasoning }: { reasoning: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2 rounded-md border bg-muted/50 px-4 py-2 text-sm shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center text-muted-foreground hover:text-foreground font-medium transition-colors"
      >
        {expanded ? (
          <ChevronDown className="mr-2 h-4 w-4" />
        ) : (
          <ChevronRight className="mr-2 h-4 w-4" />
        )}
        <BrainCircuit className="mr-2 h-4 w-4" />
        Thinking Process
      </button>
      {expanded && (
        <div className="mt-3 text-muted-foreground whitespace-pre-wrap font-mono text-xs">
          {reasoning}
        </div>
      )}
    </div>
  );
}

// Displays active and completed tool calls
function ToolInvocationBlock({ toolInvocation }: { toolInvocation: any }) {
  const [expanded, setExpanded] = useState(false);

  const isExecuting = toolInvocation.state !== "output-available";
  const hasError = !!toolInvocation.errorText;

  // Header status text
  const getStatusLabel = () => {
    if (hasError) return "Error";
    if (isExecuting) return "Executing";
    return "Executed";
  };

  return (
    <div className="my-2 rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50"
      >
        <div className="mr-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>

        <div className="mr-2">
          {isExecuting ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Wrench className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <span className={hasError ? "text-destructive" : ""}>
          {getStatusLabel()}: {toolInvocation.title}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-3">
          <div className="rounded-md bg-muted p-3">
            {/* Input Section */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Input
              </span>
              <code className="text-xs font-mono break-all leading-relaxed">
                {JSON.stringify(toolInvocation.input)}
              </code>
            </div>

            {/* Error Section */}
            {hasError && (
              <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
                <span className="text-[10px] uppercase tracking-wider font-bold text-destructive">
                  Error Message
                </span>
                <p className="text-xs font-mono text-destructive">
                  {toolInvocation.errorText}
                </p>
              </div>
            )}

            {/* Output Section */}
            {!isExecuting && !hasError && toolInvocation.output && (
              <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Output
                </span>
                <code className="text-xs font-mono break-all leading-relaxed">
                  {JSON.stringify(toolInvocation.output)}
                </code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Chat() {
  const [input, setInput] = useState("");
  // useChat automatically handles the API stream to /api/chat
  const { messages, sendMessage, status, stop, error } = useChat();

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

    // SDK uses sendMessage
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <Card className="flex flex-col  h-[95vh] lg:h-dvh w-full mx-auto shadow-lg border-muted">
      <div className="border-b bg-muted/20 p-4">
        <h2 className="font-semibold text-lg tracking-tight flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          Research Workspace
        </h2>
      </div>

      <ScrollArea className="flex-1 p-4 overflow-y-auto">
        <div className="flex flex-col gap-6 pb-4">
          {messages.map((m) => (
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
                  {/* v6 parts-based rendering */}
                  {m.parts?.map((part, index) => {
                    if (part.type.startsWith("tool-")) {
                      return (
                        <ToolInvocationBlock
                          key={index}
                          toolInvocation={part}
                        />
                      );
                    }
                    switch (part.type) {
                      case "text":
                        return (
                          <div
                            key={index}
                            className="whitespace-pre-wrap leading-relaxed"
                          >
                            <ReactMarkdown>{part.text}</ReactMarkdown>
                          </div>
                        );

                      case "reasoning":
                        return (
                          <ReasoningBlock key={index} reasoning={part.text} />
                        );

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
          ))}

          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3 justify-start items-center text-muted-foreground text-sm animate-pulse">
              <Avatar className="h-8 w-8 border">
                <AvatarFallback className="bg-background text-foreground text-xs">
                  AI
                </AvatarFallback>
              </Avatar>
              Thinking...
            </div>
          )}
          <div ref={scrollEndRef} className="h-px w-full" />
        </div>
      </ScrollArea>

      <form
        onSubmit={handleMessageSend}
        className="p-4 border-t bg-muted/20 flex gap-3"
      >
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
