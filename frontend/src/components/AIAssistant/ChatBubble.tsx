import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../../types';

interface ChatBubbleProps {
  message: ChatMessage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.type === 'user';
  
  return (
    <div className={`${
      isUser 
        ? 'flex justify-end' 
        : 'w-full'
    }`}>
      <div className={`${
        isUser ? 'max-w-lg' : 'w-full'
      } ${
        isUser 
          ? 'bg-yellow-500 text-white' 
          : 'bg-gray-700 text-white'
      } rounded-xl px-4 py-3 shadow-lg`}>
        {!isUser && (
          <div className="flex items-center space-x-1 mb-1">
            <span className="text-yellow-400 font-medium text-sm">🤖 GoldAI</span>
          </div>
        )}
        <div className="leading-relaxed prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-white prose-li:text-white">
          <ReactMarkdown
            components={{
              // Custom styling for markdown elements
              h1: ({ children }) => <h1 className="text-lg font-bold text-white mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-semibold text-white mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-medium text-white mb-1">{children}</h3>,
              p: ({ children }) => <p className="text-white mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-white">{children}</li>,
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="bg-gray-600 text-yellow-300 px-1 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ) : (
                  <code className="block bg-gray-600 text-yellow-300 p-2 rounded text-xs font-mono whitespace-pre-wrap">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <pre className="bg-gray-600 p-2 rounded mb-2 overflow-x-auto">{children}</pre>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-yellow-400 pl-3 italic text-gray-300 mb-2">
                  {children}
                </blockquote>
              ),
              strong: ({ children }) => <strong className="font-semibold text-yellow-300">{children}</strong>,
              em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
              a: ({ children, href }) => (
                <a 
                  href={href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-yellow-400 hover:text-yellow-300 underline"
                >
                  {children}
                </a>
              ),
            }}
          >
            {message.message}
          </ReactMarkdown>
        </div>
        <div className={`text-xs mt-2 text-right ${
          isUser ? 'text-yellow-100' : 'text-gray-400'
        }`}>
          <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;