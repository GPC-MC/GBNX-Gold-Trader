import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  Brain,
  ChevronDown,
  ChevronRight,
  Code,
  FileText,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Plus,
  Send,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Local types — no import from ../../types
// ---------------------------------------------------------------------------

interface ToolCall {
  name: string;
  args: string;
  result?: string;
}

interface UserMessage {
  id: string;
  type: 'user';
  content: string;
  timestamp: Date;
}

interface AiMessage {
  id: string;
  type: 'ai';
  /** Text extracted from [RESULT] that followed the planning tool call */
  planning: string;
  planningExpanded: boolean;
  toolCalls: ToolCall[];
  /** Accumulated final response text deltas */
  content: string;
  isStreaming: boolean;
  timestamp: Date;
}

type ChatMessage = UserMessage | AiMessage;

// ---------------------------------------------------------------------------
// Welcome message factory
// ---------------------------------------------------------------------------

function makeWelcomeMessage(): AiMessage {
  return {
    id: 'welcome',
    type: 'ai',
    planning: '',
    planningExpanded: false,
    toolCalls: [],
    content:
      "Hi — I'm **GoldAI Assistant**. Ask me about gold price action, risk management, macro drivers, or market news.",
    isStreaming: false,
    timestamp: new Date(),
  };
}

// ---------------------------------------------------------------------------
// ReactMarkdown custom components
// ---------------------------------------------------------------------------

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold mb-3 text-white">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold mb-3 text-white">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold mb-2 text-white">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-5 mb-3 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-5 mb-3 space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-gold-500/50 pl-4 my-3 text-gray-400 italic">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = Boolean(className);
    return isBlock ? (
      <code className="block p-3 rounded bg-ink-900 border border-gold-500/20 text-gold-200 text-[13px] font-mono whitespace-pre-wrap overflow-x-auto">
        {children}
      </code>
    ) : (
      <code className="px-1 py-0.5 rounded bg-ink-900 border border-gold-500/20 text-gold-200 text-[13px] font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="p-0 rounded mb-3 overflow-x-auto bg-transparent">{children}</pre>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gold-300 hover:text-gold-400 underline underline-offset-2"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-3">
      <table className="min-w-full text-sm border border-gold-500/20 rounded">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-gold-300 bg-ink-900 border-b border-gold-500/20">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 border-b border-gold-500/10 text-gray-300">
      {children}
    </td>
  ),
  hr: () => <hr className="my-4 border-gold-500/20" />,
};

// ---------------------------------------------------------------------------
// PlanningBlock sub-component
// ---------------------------------------------------------------------------

interface PlanningBlockProps {
  planning: string;
  planningExpanded: boolean;
  isStreaming: boolean;
  hasContent: boolean;
  onToggle: () => void;
}

const PlanningBlock: React.FC<PlanningBlockProps> = ({
  planning,
  planningExpanded,
  isStreaming,
  hasContent,
  onToggle,
}) => {
  // Show the planning block when:
  // - planning text is present, OR
  // - still streaming and the final content hasn't started yet (agent is thinking)
  const showBlock = planning.length > 0 || (isStreaming && !hasContent);
  if (!showBlock) return null;

  const isThinking = isStreaming && !hasContent && planning.length === 0;

  return (
    <div className="mb-3 rounded-lg border border-gold-500/15 bg-ink-900/60 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gold-500/5 transition-colors"
        aria-expanded={planningExpanded}
      >
        <Brain size={13} className="text-gold-400 shrink-0" />
        <span className="text-[12px] font-semibold text-gold-400 uppercase tracking-wide flex-1">
          Planning
        </span>
        {isThinking ? (
          <span className="text-[11px] text-gray-500 animate-pulse">
            Thinking...
          </span>
        ) : null}
        {planningExpanded ? (
          <ChevronDown size={13} className="text-gray-500 shrink-0" />
        ) : (
          <ChevronRight size={13} className="text-gray-500 shrink-0" />
        )}
      </button>

      {/* Body */}
      {planningExpanded && (
        <div className="px-3 pb-3 border-t border-gold-500/10">
          {isThinking ? (
            <p className="mt-2 text-[13px] text-gray-400 animate-pulse">
              Thinking…
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-gray-400 whitespace-pre-wrap leading-5">
              {planning}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ToolChip sub-component
// ---------------------------------------------------------------------------

interface ToolChipProps {
  tool: ToolCall;
}

const ToolChip: React.FC<ToolChipProps> = ({ tool }) => {
  const [expanded, setExpanded] = useState(false);
  const hasResult = tool.result !== undefined;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className={clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
          hasResult
            ? 'bg-ink-800 border-gold-500/20 text-gray-300 hover:border-gold-500/40 hover:text-white'
            : 'bg-ink-800 border-gold-500/15 text-gray-500 animate-pulse cursor-default'
        )}
        disabled={!hasResult}
        aria-expanded={expanded}
      >
        <Wrench size={11} className="shrink-0" />
        <span>{tool.name}</span>
        {hasResult &&
          (expanded ? (
            <ChevronDown size={11} className="shrink-0" />
          ) : (
            <ChevronRight size={11} className="shrink-0" />
          ))}
      </button>

      {expanded && hasResult && (
        <div className="mt-1 ml-1 p-2 rounded-lg bg-ink-900 border border-gold-500/15 text-[12px] text-gray-400 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
          {tool.result}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// AiMessageBubble sub-component
// ---------------------------------------------------------------------------

interface AiMessageBubbleProps {
  msg: AiMessage;
  onTogglePlanning: (id: string) => void;
}

const AiMessageBubble: React.FC<AiMessageBubbleProps> = ({
  msg,
  onTogglePlanning,
}) => {
  const showBouncingDots =
    msg.isStreaming && !msg.content && msg.planning.length > 0;

  return (
    <div className="min-w-0 flex-1">
      <div className="font-semibold text-sm text-gray-200 mb-2">GoldAI</div>

      {/* Planning block */}
      <PlanningBlock
        planning={msg.planning}
        planningExpanded={msg.planningExpanded}
        isStreaming={msg.isStreaming}
        hasContent={msg.content.length > 0}
        onToggle={() => onTogglePlanning(msg.id)}
      />

      {/* Tool chips */}
      {msg.toolCalls.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {msg.toolCalls.map((tool, idx) => (
            <ToolChip key={`${tool.name}-${idx}`} tool={tool} />
          ))}
        </div>
      )}

      {/* Final response */}
      {showBouncingDots ? (
        <div className="flex items-center gap-1 h-6">
          <div className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-bounce" />
          <div
            className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-bounce"
            style={{ animationDelay: '0.1s' }}
          />
          <div
            className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-bounce"
            style={{ animationDelay: '0.2s' }}
          />
        </div>
      ) : msg.content ? (
        <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-7">
          <ReactMarkdown components={markdownComponents}>
            {msg.isStreaming ? msg.content + '|' : msg.content}
          </ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

const GoldAIAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    makeWelcomeMessage(),
  ]);
  const [draft, setDraft] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  // Stable thread id for the session
  const [threadId] = useState(() => `thread-${Date.now()}`);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resolve API base URL from env, preferring VITE_BACKEND_API_BASE_URL
  const apiBaseUrl = useMemo(() => {
    const raw =
      (import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined) ||
      (import.meta.env.VITE_AI_API_BASE_URL as string | undefined) ||
      '';
    return raw.trim().replace(/\/+$/, '');
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [draft]);

  // -------------------------------------------------------------------------
  // Toggle planning panel for an AI message
  // -------------------------------------------------------------------------
  const handleTogglePlanning = (id: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === id && m.type === 'ai'
          ? { ...m, planningExpanded: !m.planningExpanded }
          : m
      )
    );
  };

  // -------------------------------------------------------------------------
  // New chat
  // -------------------------------------------------------------------------
  const handleNewChat = () => {
    setMessages([makeWelcomeMessage()]);
    setDraft('');
  };

  // -------------------------------------------------------------------------
  // Send / streaming logic
  // -------------------------------------------------------------------------
  const send = async () => {
    const question = draft.trim();
    if (!question || isStreaming) return;

    const userId = 'web-user';

    const userMsg: UserMessage = {
      id: `${Date.now()}-user`,
      type: 'user',
      content: question,
      timestamp: new Date(),
    };

    const aiMsgId = `${Date.now()}-ai`;
    const aiMsg: AiMessage = {
      id: aiMsgId,
      type: 'ai',
      planning: '',
      planningExpanded: true,
      toolCalls: [],
      content: '',
      isStreaming: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setDraft('');
    setIsStreaming(true);

    try {
      const response = await fetch(`${apiBaseUrl}/agents/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          question,
          user_id: userId,
          thread_id: threadId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Parsing state — local to this streaming call
      let awaitingPlanningResult = false;
      let buffer = '';

      const processLine = (line: string) => {
        if (!line.startsWith('data:')) return;
        const payload = line.slice(5).trim();

        if (payload === '[DONE]') {
          setMessages(prev =>
            prev.map(m =>
              m.id === aiMsgId && m.type === 'ai'
                ? {
                    ...m,
                    isStreaming: false,
                    // Collapse planning panel once answer arrives
                    planningExpanded: m.content.length === 0,
                  }
                : m
            )
          );
          return;
        }

        let parsed: { content?: string; error?: string };
        try {
          parsed = JSON.parse(payload) as { content?: string; error?: string };
        } catch {
          return;
        }

        if (parsed.error) {
          setMessages(prev =>
            prev.map(m =>
              m.id === aiMsgId && m.type === 'ai'
                ? {
                    ...m,
                    content:
                      m.content ||
                      `Sorry, an error occurred: ${parsed.error}`,
                    isStreaming: false,
                    planningExpanded: false,
                  }
                : m
            )
          );
          return;
        }

        const chunk = parsed.content ?? '';
        if (!chunk) return;

        // -- Planning tool detection
        const planningToolMatch = chunk.match(/^\[TOOL\]\s+planning\s*\(/);
        if (planningToolMatch) {
          awaitingPlanningResult = true;
          return;
        }

        // -- Other tool call detection
        const toolMatch = chunk.match(/^\[TOOL\]\s+(\w+)\s*\((.*)$/s);
        if (toolMatch) {
          awaitingPlanningResult = false;
          const toolName = toolMatch[1];
          const toolArgs = toolMatch[2].replace(/\)$/, '').trim();
          setMessages(prev =>
            prev.map(m =>
              m.id === aiMsgId && m.type === 'ai'
                ? {
                    ...m,
                    toolCalls: [
                      ...m.toolCalls,
                      { name: toolName, args: toolArgs },
                    ],
                  }
                : m
            )
          );
          return;
        }

        // -- Result detection
        const resultMatch = chunk.match(/^\[RESULT\]\s?([\s\S]*)$/);
        if (resultMatch) {
          const resultText = resultMatch[1];
          if (awaitingPlanningResult) {
            awaitingPlanningResult = false;
            setMessages(prev =>
              prev.map(m =>
                m.id === aiMsgId && m.type === 'ai'
                  ? { ...m, planning: resultText }
                  : m
              )
            );
          } else {
            // Attach result to the last tool call
            setMessages(prev =>
              prev.map(m => {
                if (m.id !== aiMsgId || m.type !== 'ai') return m;
                if (m.toolCalls.length === 0) return m;
                const updated = [...m.toolCalls];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  result: resultText,
                };
                return { ...m, toolCalls: updated };
              })
            );
          }
          return;
        }

        // -- Text delta for final response
        setMessages(prev =>
          prev.map(m =>
            m.id === aiMsgId && m.type === 'ai'
              ? { ...m, content: m.content + chunk }
              : m
          )
        );
      };

      // Read stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last (possibly incomplete) line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) processLine(trimmed);
        }
      }

      // Process any remaining buffered data
      if (buffer.trim()) processLine(buffer.trim());

      // Mark streaming complete (in case [DONE] was not sent)
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId && m.type === 'ai' && m.isStreaming
            ? { ...m, isStreaming: false, planningExpanded: false }
            : m
        )
      );
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId && m.type === 'ai'
            ? {
                ...m,
                content: `Sorry, I could not reach the server. ${errorText}`,
                isStreaming: false,
                planningExpanded: false,
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex h-screen bg-ink-950 text-white overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Left Sidebar                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={clsx(
          'flex-shrink-0 bg-ink-900 border-r border-gold-500/15 transition-all duration-300 flex flex-col',
          isLeftSidebarOpen ? 'w-[260px]' : 'w-0 overflow-hidden'
        )}
      >
        {/* Sidebar header */}
        <div className="p-3 flex-shrink-0 flex items-center justify-between border-b border-gold-500/10">
          <button
            onClick={() => setIsLeftSidebarOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gold-500/10 rounded-lg transition-colors"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <Menu size={18} />
          </button>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-gold-500/10 hover:bg-gold-500/15 border border-gold-500/15 rounded-lg transition-colors"
            aria-label="New chat"
          >
            <Plus size={15} />
            <span>New chat</span>
          </button>
        </div>

        {/* Back link */}
        <div className="px-3 pt-3">
          <Link
            to="/dashboard/ai-studio"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gold-500/10 rounded-lg mb-1 transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Back to Studio</span>
          </Link>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
            Today
          </div>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gold-500/10 rounded-lg transition-colors text-left">
            <span className="truncate">Gold price analysis</span>
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gold-500/10 rounded-lg transition-colors text-left">
            <span className="truncate">Risk management strategy</span>
          </button>

          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2 px-2">
            Previous 7 Days
          </div>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gold-500/10 rounded-lg transition-colors text-left">
            <span className="truncate">Macro drivers update</span>
          </button>
        </div>

        {/* User footer */}
        <div className="p-3 border-t border-gold-500/15">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-300 text-xs font-bold border border-gold-500/20 shrink-0">
              JD
            </div>
            <div className="text-sm font-medium text-gray-200 truncate">
              John Doe
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main Chat Area                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gold-500/15 bg-ink-950/50 backdrop-blur z-10 flex-shrink-0">
          <div className="flex items-center gap-2">
            {!isLeftSidebarOpen && (
              <button
                onClick={() => setIsLeftSidebarOpen(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gold-500/10 rounded-lg transition-colors"
                title="Open sidebar"
                aria-label="Open sidebar"
              >
                <Menu size={20} />
              </button>
            )}
            <div className="font-semibold text-gray-200">GoldAI Assistant</div>
            <span className="px-2 py-0.5 rounded text-xs bg-gold-500/10 text-gold-300 border border-gold-500/20">
              Beta
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRightSidebarOpen(prev => !prev)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gold-500/10 rounded-lg transition-colors"
              title={isRightSidebarOpen ? 'Close panel' : 'Open panel'}
              aria-label={isRightSidebarOpen ? 'Close panel' : 'Open panel'}
            >
              {isRightSidebarOpen ? (
                <PanelRightClose size={20} />
              ) : (
                <PanelRightOpen size={20} />
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full pb-36 pt-4">
            {messages.map(message => {
              const isUser = message.type === 'user';
              return (
                <div key={message.id} className="w-full px-4 py-5">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div
                      className={clsx(
                        'mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold border',
                        isUser
                          ? 'bg-ink-800 border-gold-500/20 text-gray-300'
                          : 'bg-gold-500/10 border-gold-500/20 text-gold-300'
                      )}
                      aria-hidden="true"
                    >
                      {isUser ? 'You' : 'AI'}
                    </div>

                    {/* Message content */}
                    {isUser ? (
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-gray-200 mb-1">
                          You
                        </div>
                        <p className="text-gray-300 text-[15px] leading-7 whitespace-pre-wrap">
                          {(message as UserMessage).content}
                        </p>
                      </div>
                    ) : (
                      <AiMessageBubble
                        msg={message as AiMessage}
                        onTogglePlanning={handleTogglePlanning}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink-950 via-ink-950/95 to-transparent pt-10 pb-6 px-4">
          <div className="max-w-3xl mx-auto">
            <div
              className={clsx(
                'relative flex items-end gap-2 bg-ink-800/80 backdrop-blur border rounded-2xl p-3 shadow-lg transition-all duration-200',
                isStreaming
                  ? 'border-gold-500/25 ring-1 ring-gold-500/20'
                  : 'border-gold-500/20 focus-within:border-gold-500/30 focus-within:ring-1 focus-within:ring-gold-500/30'
              )}
            >
              <button
                type="button"
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gold-500/10 transition-colors"
                title="Attach file"
                aria-label="Attach file"
                disabled={isStreaming}
              >
                <Paperclip size={20} />
              </button>

              <textarea
                ref={textareaRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                placeholder="Message GoldAI..."
                disabled={isStreaming}
                className="flex-1 max-h-[200px] bg-transparent text-gray-100 placeholder-gray-500 outline-none py-2 text-[15px] leading-6 resize-none disabled:opacity-60"
                aria-label="Message input"
              />

              <button
                type="button"
                onClick={() => void send()}
                disabled={!draft.trim() || isStreaming}
                className={clsx(
                  'p-2 rounded-xl transition-all duration-200',
                  draft.trim() && !isStreaming
                    ? 'bg-gold-500 text-ink-950 hover:bg-gold-400'
                    : 'bg-gold-500/10 text-gray-500 cursor-not-allowed'
                )}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>

            <div className="text-center mt-2 text-xs text-gray-500">
              GoldAI can make mistakes. Consider checking important information.
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Right Sidebar - Preview Panel                                        */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={clsx(
          'flex-shrink-0 bg-ink-900 border-l border-gold-500/15 transition-all duration-300 flex flex-col',
          isRightSidebarOpen ? 'w-[300px]' : 'w-0 overflow-hidden'
        )}
      >
        <div className="p-4 border-b border-gold-500/15 flex items-center justify-between flex-shrink-0">
          <h3 className="font-semibold text-gray-200">Preview</h3>
          <div className="flex gap-1">
            <button
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gold-500/10 rounded transition-colors"
              title="Code view"
              aria-label="Code view"
            >
              <Code size={16} />
            </button>
            <button
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gold-500/10 rounded transition-colors"
              title="Document view"
              aria-label="Document view"
            >
              <FileText size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center mb-3">
              <FileText size={24} className="opacity-50" aria-hidden="true" />
            </div>
            <p>No content to preview</p>
            <p className="text-xs mt-1 opacity-60">
              Generated code or files will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoldAIAssistantPage;
