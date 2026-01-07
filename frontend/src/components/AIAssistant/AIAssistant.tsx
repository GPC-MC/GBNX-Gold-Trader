import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { BarChart3, BookOpen, Lightbulb, Mic, Newspaper, Paperclip, Send, Shield } from 'lucide-react';
import { ChatMessage } from '../../types';
import ChatBubble from './ChatBubble';
import KnowledgeInputPanel from './KnowledgeInputPanel';
import VisualizationPanel from './VisualizationPanel';

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      message: "Hi, I'm the Gold AI assistant. Ask me about price action, risk, or market news.",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeVisualization, setActiveVisualization] = useState<'chart' | 'trade' | 'risk' | 'news'>('chart');
  const [activeTab, setActiveTab] = useState<'insights' | 'knowledge'>('insights');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessageToAPI = async (message: string): Promise<string> => {
    try {
      const response = await fetch('https://bf1bd891617c.ngrok-free.app/chat', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: message
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.message || 'Sorry, I could not process your request.';
    } catch (error) {
      console.error('Error calling chat API:', error);
      return "I'm currently using offline mode. The market shows moderate volatility. Monitor support near $2,320 and resistance near $2,360, and size positions conservatively.";
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    const message = inputMessage.toLowerCase();
    if (message.includes('trade') || message.includes('idea')) {
      setActiveVisualization('trade');
    } else if (message.includes('risk') || message.includes('danger')) {
      setActiveVisualization('risk');
    } else if (message.includes('chart') || message.includes('technical')) {
      setActiveVisualization('chart');
    } else if (message.includes('news') || message.includes('market')) {
      setActiveVisualization('news');
    }

    setInputMessage('');
    setIsTyping(true);

    try {
      const aiResponseText = await sendMessageToAPI(userMessage.message);
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: aiResponseText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: string) => {
    let message = '';
    switch (action) {
      case 'trade':
        message = 'Give me a short-term trade idea';
        setActiveVisualization('trade');
        break;
      case 'risk':
        message = 'Show me risk level';
        setActiveVisualization('risk');
        break;
      case 'chart':
        message = 'Show me the technical chart analysis';
        setActiveVisualization('chart');
        break;
      case 'news':
        message = 'What are the latest gold market news?';
        setActiveVisualization('news');
        break;
    }
    setInputMessage(message);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ height: 'calc(100vh - 280px)' }}>
      {/* Left Panel - Chat */}
      <div className="rounded-2xl p-6 flex flex-col h-full border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl border border-gold-500/15 bg-gold-500/10 flex items-center justify-center text-xs font-semibold text-gold-300">
            AI
          </div>
          <h2 className="text-xl font-semibold text-white">Gold AI Chat</h2>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-2" style={{ maxHeight: 'calc(100vh - 480px)' }}>
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}

          {isTyping && (
            <div className="w-fit rounded-2xl border border-gold-500/10 bg-ink-800/55 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-gold-300 font-semibold text-xs tracking-[0.18em]">GOLD AI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-gray-300 text-sm animate-pulse">Thinking…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickAction('trade')}
              className="inline-flex items-center gap-2 rounded-xl border border-gold-500/10 bg-ink-800/55 px-3 py-2 transition-all duration-200 hover:bg-ink-800/75 hover:border-gold-500/20"
            >
              <Lightbulb size={16} className="text-sky-300" />
              <span className="text-sm font-semibold text-gray-200">Trade Idea</span>
            </button>
            <button
              onClick={() => handleQuickAction('risk')}
              className="inline-flex items-center gap-2 rounded-xl border border-gold-500/10 bg-ink-800/55 px-3 py-2 transition-all duration-200 hover:bg-ink-800/75 hover:border-gold-500/20"
            >
              <Shield size={16} className="text-rose-300" />
              <span className="text-sm font-semibold text-gray-200">Risk Check</span>
            </button>
            <button
              onClick={() => handleQuickAction('chart')}
              className="inline-flex items-center gap-2 rounded-xl border border-gold-500/10 bg-ink-800/55 px-3 py-2 transition-all duration-200 hover:bg-ink-800/75 hover:border-gold-500/20"
            >
              <BarChart3 size={16} className="text-violet-300" />
              <span className="text-sm font-semibold text-gray-200">Chart Analysis</span>
            </button>
            <button
              onClick={() => handleQuickAction('news')}
              className="inline-flex items-center gap-2 rounded-xl border border-gold-500/10 bg-ink-800/55 px-3 py-2 transition-all duration-200 hover:bg-ink-800/75 hover:border-gold-500/20"
            >
              <Newspaper size={16} className="text-emerald-300" />
              <span className="text-sm font-semibold text-gray-200">News</span>
            </button>
          </div>
        </div>

        {/* Input Area */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask anything about gold… (price, risk, news, charts)"
              className="w-full rounded-xl bg-ink-800/55 border border-gold-500/15 px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gold-500/35 focus:ring-2 focus:ring-gold-500/15"
            />
          </div>
          <button className="p-3 rounded-xl text-gray-500 hover:text-gold-300 hover:bg-white/5 transition-colors duration-200" title="Voice">
            <Mic size={20} />
          </button>
          <button className="p-3 rounded-xl text-gray-500 hover:text-gold-300 hover:bg-white/5 transition-colors duration-200" title="Attach">
            <Paperclip size={20} />
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            className={clsx(
              'p-3 rounded-xl transition-all duration-200',
              inputMessage.trim()
                ? 'bg-gradient-to-r from-gold-500 to-gold-300 text-ink-900 hover:brightness-105 shadow-glow'
                : 'bg-ink-800/40 text-gray-500 cursor-not-allowed'
            )}
            title="Send"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Right Panel - Visualization */}
      <div className="rounded-2xl overflow-hidden h-full flex flex-col border border-gold-500/15 bg-ink-850/55 shadow-panel backdrop-blur-sm">
        <div className="flex border-b border-gold-500/10">
          <button
            onClick={() => setActiveTab('insights')}
            className={clsx(
              'flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200',
              activeTab === 'insights'
                ? 'bg-gold-500/10 text-gold-300'
                : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <BarChart3 size={16} />
              <span>Trading Insights</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={clsx(
              'flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200',
              activeTab === 'knowledge'
                ? 'bg-gold-500/10 text-gold-300'
                : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <BookOpen size={16} />
              <span>Upload Knowledge</span>
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'insights' && <VisualizationPanel activeVisualization={activeVisualization} />}
          {activeTab === 'knowledge' && <KnowledgeInputPanel />}
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;

