import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Paperclip, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChatMessage } from '../../types';

const GoldAIAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'ai',
      message:
        "Hi — I’m GoldAI Assistant. Ask me about gold price action, risk management, macro drivers, or market news.",
      timestamp: new Date()
    }
  ]);
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const apiBaseUrl = useMemo(() => {
    const raw = (import.meta.env.VITE_AI_API_BASE_URL as string | undefined) || '';
    return raw.trim().replace(/\/+$/, '');
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [draft]);

  const getAssistantReply = async (question: string): Promise<string> => {
    if (apiBaseUrl) {
      try {
        const res = await fetch(`${apiBaseUrl}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ question })
        });

        if (res.ok) {
          const data = (await res.json()) as { message?: string };
          if (data?.message) return data.message;
        }
      } catch {
        // Fall back to offline mode.
      }
    }

    const q = question.toLowerCase();
    if (q.includes('risk') || q.includes('stop') || q.includes('position')) {
      return [
        'Risk checklist:',
        '- Define invalidation (stop) before entry',
        '- Risk 0.5–1% per trade (max)',
        '- Reduce size near major events (CPI/FOMC)',
        '- Avoid adding to losers; scale only when in profit'
      ].join('\n');
    }

    if (q.includes('news') || q.includes('macro') || q.includes('fed') || q.includes('cpi')) {
      return [
        'Macro drivers to watch for gold:',
        '- Real yields (often inverse)',
        '- USD strength (often inverse)',
        '- Risk-off flows / geopolitics',
        '- Central bank demand',
        '',
        'If you tell me your timeframe, I can tailor a scenario checklist.'
      ].join('\n');
    }

    if (q.includes('trade') || q.includes('setup') || q.includes('entry')) {
      return [
        'A clean way to structure a gold setup:',
        '- Identify trend on 4H/1D',
        '- Mark key support/resistance',
        '- Wait for confirmation (break + retest or rejection)',
        '- Place stop beyond structure; target at next liquidity area',
        '',
        'Share your timeframe + levels you’re watching and I’ll propose a plan.'
      ].join('\n');
    }

    return "Got it. Tell me your timeframe (scalp/swing/invest) and what you’re trying to decide, and I’ll help you structure the next step.";
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || isTyping) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      type: 'user',
      message: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setDraft('');
    setIsTyping(true);

    try {
      const reply = await getAssistantReply(text);
      const aiMessage: ChatMessage = {
        id: `${Date.now()}-ai`,
        type: 'ai',
        message: reply,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col">
      <div className="sticky top-16 z-40 border-b border-gold-500/10 bg-ink-950/65 backdrop-blur">
        <div className="mx-auto w-full max-w-[980px] px-4 sm:px-6">
          <div className="h-14 flex items-center gap-3">
            <Link
              to="/dashboard/ai-studio"
              className="inline-flex items-center gap-2 rounded-xl border border-gold-500/10 bg-ink-800/55 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-ink-800/75 hover:border-gold-500/20 transition-all duration-200"
            >
              <ArrowLeft size={16} className="text-gold-300" />
              Back to AI Studio
            </Link>
            <div className="flex-1 text-center">
              <div className="text-[15px] font-semibold text-white">GoldAI Assistant</div>
            </div>
            <div className="w-[160px]" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {messages.map(message => {
          const isUser = message.type === 'user';
          return (
            <div
              key={message.id}
              className={clsx(
                'w-full border-b border-white/5',
                isUser ? 'bg-transparent' : 'bg-ink-900/30'
              )}
            >
              <div className="mx-auto w-full max-w-[980px] px-4 sm:px-6 py-7">
                <div className="flex gap-4">
                  <div
                    className={clsx(
                      'mt-0.5 h-9 w-9 shrink-0 rounded-xl border flex items-center justify-center text-xs font-semibold',
                      isUser
                        ? 'border-gold-500/20 bg-gold-500/10 text-gold-200'
                        : 'border-gold-500/15 bg-ink-800/55 text-gold-300'
                    )}
                    aria-hidden="true"
                  >
                    {isUser ? 'YOU' : 'AI'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold text-gray-100">{isUser ? 'You' : 'GoldAI'}</div>
                      <div className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="mt-2 text-[16px] leading-7 text-gray-100">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-white">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 text-white">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-white">{children}</h3>,
                          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          code: ({ children, className }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="px-1 py-0.5 rounded bg-ink-900/60 border border-gold-500/10 text-gold-200 text-[13px] font-mono">
                                {children}
                              </code>
                            ) : (
                              <code className="block p-3 rounded bg-ink-900/60 border border-gold-500/10 text-gold-200 text-[13px] font-mono whitespace-pre-wrap">
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => (
                            <pre className="p-3 rounded mb-3 overflow-x-auto bg-ink-900/60 border border-gold-500/10">
                              {children}
                            </pre>
                          ),
                          a: ({ children, href }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gold-300 hover:text-gold-500 underline underline-offset-2"
                            >
                              {children}
                            </a>
                          )
                        }}
                      >
                        {message.message}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="w-full border-b border-white/5 bg-ink-900/30">
            <div className="mx-auto w-full max-w-[980px] px-4 sm:px-6 py-7">
              <div className="flex gap-4">
                <div className="mt-0.5 h-9 w-9 shrink-0 rounded-xl border border-gold-500/15 bg-ink-800/55 flex items-center justify-center text-xs font-semibold text-gold-300">
                  AI
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-100">GoldAI</div>
                  <div className="mt-3 flex items-center gap-2 text-gray-300">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-gold-500 animate-bounce" />
                      <div
                        className="h-2 w-2 rounded-full bg-gold-500 animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      />
                      <div
                        className="h-2 w-2 rounded-full bg-gold-500 animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                    </div>
                    <span className="text-sm">Thinking…</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 border-t border-gold-500/10 bg-ink-950/70 backdrop-blur">
        <div className="mx-auto w-full max-w-[980px] px-4 sm:px-6 py-4">
          <div className="rounded-2xl border border-gold-500/15 bg-ink-800/55 shadow-panel backdrop-blur-sm px-3 py-3">
            <div className="flex items-end gap-2">
              <button
                type="button"
                className="mb-1 p-2 rounded-xl text-gray-400 hover:text-gold-300 hover:bg-white/5 transition-colors duration-200"
                title="Attach"
                aria-label="Attach"
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
                placeholder="Message GoldAI…"
                className="flex-1 resize-none bg-transparent text-gray-100 placeholder-gray-500 outline-none px-2 py-2 text-[16px] leading-6"
              />

              <button
                type="button"
                onClick={() => void send()}
                disabled={!draft.trim() || isTyping}
                className={clsx(
                  'mb-1 inline-flex items-center justify-center rounded-xl p-2 transition-all duration-200',
                  draft.trim() && !isTyping
                    ? 'bg-gradient-to-r from-gold-500 to-gold-300 text-ink-900 hover:brightness-105 shadow-glow'
                    : 'bg-ink-800/40 text-gray-500 cursor-not-allowed'
                )}
                title="Send"
                aria-label="Send"
              >
                <Send size={20} />
              </button>
            </div>
          </div>

          <div className="mt-3 text-center text-xs text-gray-500">
            Press <span className="text-gray-300 font-semibold">Enter</span> to send,{' '}
            <span className="text-gray-300 font-semibold">Shift</span>+<span className="text-gray-300 font-semibold">Enter</span> for a new line.
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoldAIAssistantPage;
