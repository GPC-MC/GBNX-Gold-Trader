import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, BarChart3, Lightbulb, Shield, Paperclip, Newspaper, BookOpen } from 'lucide-react';
import { ChatMessage } from '../../types';
import ChatBubble from './ChatBubble';
import VisualizationPanel from './VisualizationPanel';
import KnowledgeInputPanel from './KnowledgeInputPanel';

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      message: "Hi, I'm GoldAI Assistant who helps people to trade gold more effectively",
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
          'accept': 'application/json',
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
      return 'I\'m currently using offline mode. Here\'s what I can tell you about gold: The current market shows moderate volatility with technical indicators suggesting a cautious approach. Consider monitoring key support levels around $2,320 and resistance near $2,360.';
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
    
    // Update visualization based on message content
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
      // Call the actual API
      const aiResponseText = await sendMessageToAPI(inputMessage);
      
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: aiResponseText,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
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
    <div>
      {/* Main Content - Two Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ height: 'calc(100vh - 280px)' }}>
          {/* Left Panel - Chat */}
          <div className="rounded-2xl p-6 flex flex-col h-full border" style={{ backgroundColor: '#121826', borderColor: 'rgba(212, 175, 55, 0.15)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)' }}>
                🤖
              </div>
              <h2 className="text-xl font-semibold" style={{ color: '#E5E7EB' }}>GoldAI Chat</h2>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-2" style={{ maxHeight: 'calc(100vh - 480px)' }}>
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
                {isTyping && (
                  <div className="bg-gray-700 rounded-lg px-4 py-3 w-fit">
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="text-yellow-400 font-medium text-sm">🤖 GoldAI</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-gray-300 text-sm animate-pulse">Thinking...</span>
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
                  className="flex items-center space-x-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-2 rounded-lg transition-all duration-200 text-sm"
                >
                  <Lightbulb size={16} />
                  <span>Trade Idea</span>
                </button>
                <button
                  onClick={() => handleQuickAction('risk')}
                  className="flex items-center space-x-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg transition-all duration-200 text-sm"
                >
                  <Shield size={16} />
                  <span>Risk Check</span>
                </button>
                <button
                  onClick={() => handleQuickAction('chart')}
                  className="flex items-center space-x-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-2 rounded-lg transition-all duration-200 text-sm"
                >
                  <BarChart3 size={16} />
                  <span>Chart Analysis</span>
                </button>
                <button
                  onClick={() => handleQuickAction('news')}
                  className="flex items-center space-x-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-2 rounded-lg transition-all duration-200 text-sm"
                >
                  <Newspaper size={16} />
                  <span>News</span>
                </button>
              </div>
            </div>

            {/* Input Area */}
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me anything about gold... (price, risk, news, charts)"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                />
              </div>
              <button className="p-3 text-gray-400 hover:text-yellow-400 transition-colors duration-200">
                <Mic size={20} />
              </button>
              <button className="p-3 text-gray-400 hover:text-yellow-400 transition-colors duration-200">
                <Paperclip size={20} />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-all duration-200 hover:scale-105"
              >
                <Send size={20} />
              </button>
            </div>
          </div>

          {/* Right Panel - Visualization */}
          <div className="rounded-2xl overflow-hidden h-full flex flex-col border" style={{ backgroundColor: '#121826', borderColor: 'rgba(212, 175, 55, 0.15)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
            {/* Tab Navigation */}
            <div className="flex border-b" style={{ borderColor: 'rgba(212, 175, 55, 0.1)' }}>
              <button
                onClick={() => setActiveTab('insights')}
                className="flex-1 px-6 py-4 text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: activeTab === 'insights' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                  color: activeTab === 'insights' ? '#D4AF37' : '#9CA3AF',
                  borderBottom: activeTab === 'insights' ? '2px solid #D4AF37' : 'none'
                }}
              >
                <div className="flex items-center justify-center space-x-2">
                  <BarChart3 size={16} />
                  <span>Trading Insights</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('knowledge')}
                className="flex-1 px-6 py-4 text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: activeTab === 'knowledge' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                  color: activeTab === 'knowledge' ? '#D4AF37' : '#9CA3AF',
                  borderBottom: activeTab === 'knowledge' ? '2px solid #D4AF37' : 'none'
                }}
              >
                <div className="flex items-center justify-center space-x-2">
                  <BookOpen size={16} />
                  <span>Upload Knowledge</span>
                </div>
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'insights' && (
                <VisualizationPanel activeVisualization={activeVisualization} />
              )}
              {activeTab === 'knowledge' && (
                <KnowledgeInputPanel />
              )}
            </div>
          </div>
        </div>
      </div>
  );
};

export default AIAssistant;