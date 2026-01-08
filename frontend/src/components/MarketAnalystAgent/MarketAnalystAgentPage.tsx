import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, 
  Paperclip, 
  Send, 
  Plus, 
  MessageSquare, 
  PanelRightClose, 
  PanelRightOpen,
  FileText,
  Code,
  ChevronLeft,
  Menu
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChatMessage } from '../../types';

const MarketAnalystAgentPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'ai',
      message:
        "Hello. I am the Market Analyst Agent. I can help you with market overview, macro signals, and fundamental analysis.",
      timestamp: new Date()
    }
  ]);
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  
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
    // Placeholder logic - in a real app, this would hit a specific endpoint for this agent
    if (apiBaseUrl) {
      try {
        const res = await fetch(`${apiBaseUrl}/chat`, { // Potentially different endpoint
          method: 'POST',
          headers: { 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ question, agent: 'market-analyst' }) // Pass agent type
        });

        if (res.ok) {
          const data = (await res.json()) as { message?: string };
          if (data?.message) return data.message;
        }
      } catch {
        // Fall back to offline mode.
      }
    }

    return "I am analyzing the market data based on your request. Please provide more specific details if you need a deep dive into a particular asset or economic event.";
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

  const handleNewChat = () => {
    setMessages([
      {
        id: 'welcome',
        type: 'ai',
        message: "Hello. I am the Market Analyst Agent. I can help you with market overview, macro signals, and fundamental analysis.",
        timestamp: new Date()
      }
    ]);
    setDraft('');
  };

  return (
    <div className="flex h-screen bg-ink-950 text-white overflow-hidden">
      {/* Left Sidebar */}
      <div 
        className={clsx(
          "flex-shrink-0 bg-ink-900 border-r border-white/5 transition-all duration-300 flex flex-col",
          isLeftSidebarOpen ? "w-[260px]" : "w-0 overflow-hidden"
        )}
      >
        <div className="p-3 flex-shrink-0">
          <Link
            to="/dashboard/ai-studio"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg mb-2 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Studio</span>
          </Link>
          
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors text-left"
          >
            <Plus size={16} />
            <span>New chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="text-xs font-semibold text-gray-500 mb-2 px-2">Today</div>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors text-left truncate">
            <span className="truncate">Market Overview</span>
          </button>
        </div>

        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-300 text-xs font-bold border border-gold-500/20">
              JD
            </div>
            <div className="text-sm font-medium text-gray-200">John Doe</div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-ink-950/50 backdrop-blur z-10">
          <div className="flex items-center gap-2">
            {!isLeftSidebarOpen && (
              <button 
                onClick={() => setIsLeftSidebarOpen(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
              >
                <Menu size={20} />
              </button>
            )}
            <div className="font-semibold text-gray-200">Market Analyst Agent</div>
            <span className="px-2 py-0.5 rounded text-xs bg-gold-500/10 text-gold-300 border border-gold-500/20">Beta</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
              title={isRightSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isRightSidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full pb-32 pt-4">
            {messages.map((message, idx) => {
              const isUser = message.type === 'user';
              return (
                <div
                  key={message.id}
                  className={clsx(
                    'w-full px-4 py-6',
                  )}
                >
                  <div className="flex gap-4 max-w-3xl mx-auto">
                    <div
                      className={clsx(
                        'mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold border',
                        isUser
                          ? 'bg-ink-800 border-white/10 text-gray-300'
                          : 'bg-gold-500/10 border-gold-500/20 text-gold-300'
                      )}
                    >
                      {isUser ? 'You' : 'AI'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-gray-200 mb-1">
                        {isUser ? 'You' : 'Market Analyst'}
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-7">
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
                                <code className="px-1 py-0.5 rounded bg-ink-900 border border-white/10 text-gold-200 text-[13px] font-mono">
                                  {children}
                                </code>
                              ) : (
                                <code className="block p-3 rounded bg-ink-900 border border-white/10 text-gold-200 text-[13px] font-mono whitespace-pre-wrap overflow-x-auto">
                                  {children}
                                </code>
                              );
                            },
                            pre: ({ children }) => (
                              <pre className="p-0 rounded mb-3 overflow-x-auto bg-transparent">
                                {children}
                              </pre>
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
                            )
                          }}
                        >
                          {message.message}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="w-full px-4 py-6">
                <div className="flex gap-4 max-w-3xl mx-auto">
                  <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-xs font-semibold text-gold-300">
                    AI
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-gray-200 mb-1">Market Analyst</div>
                    <div className="flex items-center gap-1 h-6">
                      <div className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-bounce" />
                      <div className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink-950 via-ink-950 to-transparent pt-10 pb-6 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-ink-800/80 backdrop-blur border border-white/10 rounded-2xl p-3 shadow-lg focus-within:border-gold-500/30 focus-within:ring-1 focus-within:ring-gold-500/30 transition-all">
              <button
                type="button"
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Attach file"
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
                placeholder="Message Market Analyst..."
                className="flex-1 max-h-[200px] bg-transparent text-gray-100 placeholder-gray-500 outline-none py-2 text-[15px] leading-6 resize-none"
              />

              <button
                type="button"
                onClick={() => void send()}
                disabled={!draft.trim() || isTyping}
                className={clsx(
                  'p-2 rounded-xl transition-all duration-200',
                  draft.trim() && !isTyping
                    ? 'bg-gold-500 text-ink-950 hover:bg-gold-400'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                )}
              >
                <Send size={18} />
              </button>
            </div>
            <div className="text-center mt-2 text-xs text-gray-500">
              AI can make mistakes. Consider checking important information.
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Preview Panel */}
      <div 
        className={clsx(
          "flex-shrink-0 bg-ink-900 border-l border-white/5 transition-all duration-300 flex flex-col",
          isRightSidebarOpen ? "w-[300px]" : "w-0 overflow-hidden"
        )}
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-gray-200">Preview</h3>
          <div className="flex gap-1">
            <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded">
              <Code size={16} />
            </button>
            <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded">
              <FileText size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
              <FileText size={24} className="opacity-50" />
            </div>
            <p>No content to preview</p>
            <p className="text-xs mt-1 opacity-60">Generated code or files will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketAnalystAgentPage;
