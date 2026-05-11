"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import { ThemeToggle } from "./theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Send,
  BrainCircuit,
  Search,
  PenTool,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Wrench,
  Sparkles,
  Trash2,
} from "lucide-react";


// Types
type NodeName = "supervisor" | "gatherer" | "writer" | "reviewer" | string;

interface NodeConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
  pulse: "pulse" | "bounce" | "spin";
}

// Graph Node config

function getNodeConfig(nodeName: NodeName): NodeConfig {
  switch (nodeName) {
    case "supervisor":
      return {
        label: "Planning research strategy",
        icon: <BrainCircuit size={15} />,
        color: "text-primary",
        pulse: "pulse",
      };
    case "gatherer":
      return {
        label: "Gathering data from sources",
        icon: <Search size={15} />,
        color: "text-primary/70",
        pulse: "bounce",
      };
    case "writer":
      return {
        label: "Drafting the report",
        icon: <PenTool size={15} />,
        color: "text-primary/80",
        pulse: "pulse",
      };
    case "reviewer":
      return {
        label: "Reviewing for accuracy",
        icon: <CheckCircle size={15} />,
        color: "text-primary/60",
        pulse: "pulse",
      };
    default:
      return {
        label: "Agent is processing",
        icon: <Loader2 size={15} />,
        color: "text-muted-foreground",
        pulse: "spin",
      };
  }
}

// Node animated status indicator during stream

function NodeStatusPill({ nodeName }: { nodeName: NodeName }) {
  const config = getNodeConfig(nodeName);
  const animClass =
    config.pulse === "spin"
      ? "animate-spin"
      : config.pulse === "bounce"
      ? "animate-bounce"
      : "animate-pulse";

  return (
    <div className="flex items-center gap-2 py-1">
      <span className={`${config.color} ${animClass} shrink-0`}>
        {config.icon}
      </span>
      <span className="text-[13px] font-medium text-muted-foreground leading-none">
        {config.label}
        <span className="inline-flex gap-[3px] ml-1.5 align-middle">
          {[0, 150, 300].map((d) => (
            <span
              key={d}
              className="inline-block w-[3px] h-[3px] rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: `${d}ms` }}
            />
          ))}
        </span>
      </span>
    </div>
  );
}

// ReasoningBlock — collapsible extended thinking

function ReasoningBlock({ reasoning }: { reasoning: string }) {
  const [open, setOpen] = useState(false);
  if (!reasoning?.trim()) return null;

  return (
    <div className="mb-3 border border-border/40 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] text-muted-foreground bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <Sparkles size={12} className="shrink-0 text-primary/60" />
        <span className="font-medium">Extended thinking</span>
        <span className="ml-auto shrink-0">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
      </button>
      {open && (
        <div className="px-3 py-2 text-[12px] text-muted-foreground/80 leading-relaxed font-mono whitespace-pre-wrap border-t border-border/30 bg-muted/10">
          {reasoning}
        </div>
      )}
    </div>
  );
}

// ToolInvocationBlock — collapsible tool call display

function ToolInvocationBlock({ toolInvocation }: { toolInvocation: any }) {
  const [open, setOpen] = useState(false);
  const name = toolInvocation?.toolName ?? toolInvocation?.type ?? "tool";
  const state = toolInvocation?.state;

  return (
    <div className="mb-2 border border-border/40 rounded-lg overflow-hidden text-[12px]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <Wrench size={12} className="shrink-0 text-primary/60" />
        <span className="font-mono text-muted-foreground truncate">{name}</span>
        {state === "call" && (
          <Loader2 size={11} className="ml-auto shrink-0 animate-spin text-muted-foreground/60" />
        )}
        {state === "result" && (
          <CheckCircle size={11} className="ml-auto shrink-0 text-primary/70" />
        )}
        {!state && (
          <span className="ml-auto shrink-0">
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
      </button>
      {open && (
        <div className="px-3 py-2 bg-muted/10 border-t border-border/30 font-mono text-[11px] text-muted-foreground/80 whitespace-pre-wrap break-all">
          {JSON.stringify(toolInvocation, null, 2)}
        </div>
      )}
    </div>
  );
}


// TypingIndicator — 3-dot animation for initial wait

function TypingIndicator() {
  return (
    <div className="flex gap-[5px] items-center py-2 px-1">
      {[0, 160, 320].map((d) => (
        <span
          key={d}
          className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </div>
  );
}

// AssistantBubble — renders a single assistant message

function AssistantBubble({ message }: { message: any }) {
  const hasText = message.parts?.some(
    (p: any) => p.type === "text" && p.text?.trim()
  );

  const customDataParts = (message.parts ?? []).filter(
    (p: any) => p.type === "data-custom"
  );
  const latestNode: NodeName | null =
    customDataParts.length > 0
      ? (customDataParts[customDataParts.length - 1] as any).data?.node ?? null
      : null;

  return (
    <div className="flex gap-2.5 sm:gap-3 items-start justify-start">
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-border shadow-sm">
          <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px] font-semibold">
            AI
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Bubble */}
      <div className="flex-1 min-w-0 max-w-[calc(100%-44px)] sm:max-w-[85%]">
        <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 sm:px-4 sm:py-3 bg-card border border-border/40 shadow-sm">
          {/* Node status — only while no text yet */}
          {!hasText && latestNode && (
            <NodeStatusPill nodeName={latestNode} />
          )}
          {!hasText && !latestNode && <TypingIndicator />}

          {/* Parts */}
          {message.parts?.map((part: any, i: number) => {
            if (part.type?.startsWith("tool-")) {
              return <ToolInvocationBlock key={i} toolInvocation={part} />;
            }
            switch (part.type) {
              case "text":
                if (!part.text?.trim()) return null;
                return (
                  <div
                    key={i}
                    className="prose prose-sm dark:prose-invert max-w-none
                      prose-p:leading-relaxed prose-p:my-1.5
                      prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-1.5
                      prose-code:text-[12px] prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                      prose-pre:bg-muted prose-pre:rounded-lg prose-pre:text-[12px] prose-pre:overflow-x-auto
                      prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
                      prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-3 prose-blockquote:text-muted-foreground
                      break-words overflow-x-auto"
                  >
                    <ReactMarkdown>{part.text}</ReactMarkdown>
                  </div>
                );
              case "reasoning":
                return <ReasoningBlock key={i} reasoning={part.text} />;
              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
}

// UserBubble

function UserBubble({ message }: { message: any }) {
  const text = message.parts
    ?.filter((p: any) => p.type === "text")
    .map((p: any) => p.text)
    .join("") ?? message.content ?? "";

  return (
    <div className="flex gap-2.5 sm:gap-3 items-end justify-end">
      {/* Bubble */}
      <div className="max-w-[80%] sm:max-w-[75%] min-w-0">
        <div className="rounded-2xl rounded-br-sm px-3.5 py-2.5 sm:px-4 sm:py-3 bg-primary text-primary-foreground shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {text}
          </p>
        </div>
      </div>

      {/* Avatar */}
      <div className="shrink-0 mb-0.5">
        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-border/40 shadow-sm">
          <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px] font-semibold">
            You
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}

// EmptyState

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 py-12 text-center select-none">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <BrainCircuit size={22} className="text-primary" />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-semibold text-base text-foreground">
          Research Workspace
        </h3>
        <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">
          Ask anything. The agent will plan, gather, write, and review — then deliver a complete report.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-1">
        {[
          "Explain transformer architecture",
          "Latest trends in AI research",
          "Compare RAG vs fine-tuning",
        ].map((s) => (
          <span
            key={s}
            className="text-[11px] text-muted-foreground bg-muted/60 border border-border/40 rounded-full px-3 py-1 leading-none"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

// Main Chat Component

export default function Chat() {
  const [inputValue, setInputValue] = useState("");
  const { messages, sendMessage, setMessages, status } = useChat();
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = status === "streaming" || status === "submitted";
  const showInitialTyping =
    isStreaming && messages[messages.length - 1]?.role === "user";

  // Auto-scroll
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [inputValue]);

  const handleSend = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!inputValue.trim() || isStreaming) return;
      sendMessage({ text: inputValue });
      setInputValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
    [inputValue, isStreaming, sendMessage]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[95vh] lg:h-[100vh] min-h-0 w-full bg-background border-l-accent border-l-1">
      {/* ── Header ── */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/60 bg-background/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BrainCircuit size={15} className="text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground tracking-tight">
            Research Workspace
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              disabled={isStreaming}
              aria-label="Clear chat"
              title="Clear chat"
              className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 size={15} />
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-3xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-4 sm:gap-5">
              {messages.map((m) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} message={m} />
                ) : (
                  <AssistantBubble key={m.id} message={m} />
                )
              )}

              {/* Fallback typing indicator while first response hasn't started */}
              {showInitialTyping && (
                <div className="flex gap-2.5 sm:gap-3 items-start justify-start">
                  <div className="shrink-0 mt-0.5">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-border shadow-sm">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px] font-semibold">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 bg-card border border-border/40 shadow-sm">
                    <TypingIndicator />
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={scrollEndRef} className="h-4" />
        </div>
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 border-t border-border/60 bg-background/80 backdrop-blur-sm px-3 sm:px-4 py-3">
        <form
          onSubmit={handleSend}
          className="max-w-3xl mx-auto flex items-end gap-2 bg-card border border-border rounded-2xl px-3 py-2 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all"
        >
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the agent to research anything…"
            rows={1}
            disabled={isStreaming}
            className="flex-1 min-w-0 bg-transparent resize-none outline-none text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 disabled:opacity-50 py-1 max-h-40 overflow-y-auto"
            style={{ fieldSizing: "content" } as any}
          />
          <button
            type="submit"
            disabled={isStreaming || !inputValue.trim()}
            aria-label="Send message"
            className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all
              bg-primary text-primary-foreground shadow-sm
              hover:opacity-90 active:scale-95
              disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 mb-0.5"
          >
            {isStreaming ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </form>
        <p className="text-center text-[11px] text-muted-foreground/50 mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}