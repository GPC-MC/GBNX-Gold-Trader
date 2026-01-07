import React from 'react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../../types';

interface ChatBubbleProps {
  message: ChatMessage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.type === 'user';

  const textPrimary = isUser ? 'text-ink-900' : 'text-gray-100';
  const textSecondary = isUser ? 'text-ink-900/70' : 'text-gray-500';

  return (
    <div className={clsx(isUser ? 'flex justify-end' : 'w-full')}>
      <div
        className={clsx(
          isUser ? 'max-w-lg' : 'w-full',
          'rounded-2xl px-4 py-3',
          isUser
            ? 'bg-gradient-to-r from-gold-500 to-gold-300 text-ink-900 shadow-glow'
            : 'border border-gold-500/10 bg-ink-800/55 text-gray-100 shadow-panel backdrop-blur-sm'
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gold-300 font-semibold text-xs tracking-[0.18em]">GOLD AI</span>
          </div>
        )}

        <div className="leading-relaxed">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className={clsx('text-lg font-bold mb-2', textPrimary)}>{children}</h1>,
              h2: ({ children }) => <h2 className={clsx('text-base font-semibold mb-2', textPrimary)}>{children}</h2>,
              h3: ({ children }) => <h3 className={clsx('text-sm font-semibold mb-1', textPrimary)}>{children}</h3>,
              p: ({ children }) => <p className={clsx('mb-2 last:mb-0', textPrimary)}>{children}</p>,
              ul: ({ children }) => <ul className={clsx('list-disc list-inside mb-2 space-y-1', textPrimary)}>{children}</ul>,
              ol: ({ children }) => <ol className={clsx('list-decimal list-inside mb-2 space-y-1', textPrimary)}>{children}</ol>,
              li: ({ children }) => <li className={textPrimary}>{children}</li>,
              code: ({ children, className }) => {
                const isInline = !className;

                return isInline ? (
                  <code
                    className={clsx(
                      'px-1 py-0.5 rounded text-xs font-mono',
                      isUser
                        ? 'bg-black/10 text-ink-900'
                        : 'bg-ink-900/60 text-gold-300 border border-gold-500/10'
                    )}
                  >
                    {children}
                  </code>
                ) : (
                  <code
                    className={clsx(
                      'block p-2 rounded text-xs font-mono whitespace-pre-wrap',
                      isUser
                        ? 'bg-black/10 text-ink-900'
                        : 'bg-ink-900/60 text-gold-300 border border-gold-500/10'
                    )}
                  >
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre
                  className={clsx(
                    'p-2 rounded mb-2 overflow-x-auto',
                    isUser
                      ? 'bg-black/10'
                      : 'bg-ink-900/60 border border-gold-500/10'
                  )}
                >
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote
                  className={clsx(
                    'border-l-4 pl-3 italic mb-2',
                    isUser ? 'border-black/20 text-ink-900/80' : 'border-gold-500/40 text-gray-300'
                  )}
                >
                  {children}
                </blockquote>
              ),
              strong: ({ children }) => (
                <strong className={clsx('font-semibold', isUser ? 'text-ink-900' : 'text-gold-300')}>
                  {children}
                </strong>
              ),
              em: ({ children }) => <em className={clsx('italic', isUser ? 'text-ink-900/80' : 'text-gray-300')}>{children}</em>,
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={clsx(
                    'underline underline-offset-2 transition-colors duration-200',
                    isUser ? 'text-ink-900 hover:text-ink-900/80' : 'text-gold-300 hover:text-gold-500'
                  )}
                >
                  {children}
                </a>
              ),
            }}
          >
            {message.message}
          </ReactMarkdown>
        </div>

        <div className={clsx('text-xs mt-2 text-right', textSecondary)}>
          <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;

