import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  X, 
  User, 
  Loader2,
  Minimize2,
  Maximize2,
  Image as ImageIcon,
  Sparkles,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { useAuth } from '../../hooks/useAuth';
import { tradingService } from '../../services/tradingService';
import DragDropUpload from '../UI/DragDropUpload';
import toast from 'react-hot-toast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'analysis';
}

// Sydney Avatar Component
const SydneyAvatar = ({ className = "w-4 h-4" }: { className?: string }) => (
  <div className={`${className} bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center`}>
    <Sparkles className="w-3/4 h-3/4 text-white" />
  </div>
);

interface EnhancedChatInterfaceProps {
  currentSessionId?: string;
  onSessionSwitch?: (sessionId: string) => void;
  onTradeDataExtracted?: (tradeData: any) => void;
}

const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({ 
  currentSessionId, 
  onSessionSwitch,
  onTradeDataExtracted 
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Load initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = getPersonalizedGreeting();
      const greetingMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages([greetingMessage]);
    }
  }, [isOpen]);

  const getPersonalizedGreeting = () => {
    const hour = new Date().getHours();
    const userName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'there';
    
    let timeGreeting = '';
    if (hour >= 5 && hour < 12) timeGreeting = 'Good morning';
    else if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
    else if (hour >= 17 && hour < 22) timeGreeting = 'Good evening';
    else timeGreeting = 'Hello';

    const greetings = [
      `${timeGreeting} ${userName}! 👋 I'm Sydney, your AI trading assistant. How can I help you analyze your trades today?`,
      `${timeGreeting} ${userName}! 📊 Ready to dive into some trading analysis? I'm here to help!`,
      `${timeGreeting} ${userName}! 🚀 What trading insights can I provide for you today?`,
      `${timeGreeting} ${userName}! 💡 I'm here to help with market analysis, trade reviews, and trading strategies!`
    ];

    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  const getTradingContext = async () => {
    if (!user || !currentSessionId) return '';

    try {
      const trades = await tradingService.getTrades(currentSessionId);
      const sessions = await tradingService.getSessions(user.id);
      
      const currentSession = sessions.find(s => s.id === currentSessionId);
      const totalPnL = trades.reduce((sum, trade) => sum + trade.profit_loss, 0);
      const winRate = trades.length > 0 ? (trades.filter(t => t.profit_loss > 0).length / trades.length) * 100 : 0;

      return `Current trading context:
- Session: ${currentSession?.name || 'Unknown'}
- Total trades: ${trades.length}
- Total P&L: $${totalPnL.toFixed(2)}
- Win rate: ${winRate.toFixed(1)}%
- Recent trades: ${trades.slice(0, 3).map(t => `${t.entry_side} $${t.profit_loss.toFixed(2)}`).join(', ')}`;
    } catch (error) {
      return '';
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get trading context
      const context = await getTradingContext();
      
      // Check for session switching
      const sessionSwitchPatterns = [
        /load\s+(?:the\s+)?(.+?)\s+session/i,
        /switch\s+to\s+(.+)/i,
        /open\s+(.+?)\s+session/i
      ];

      let sessionSwitched = false;
      for (const pattern of sessionSwitchPatterns) {
        const match = currentInput.match(pattern);
        if (match) {
          const sessionName = match[1];
          // In a real implementation, you'd search for the session
          if (onSessionSwitch) {
            // For demo, we'll just show a response
            const assistantMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `I'd help you switch to the "${sessionName}" session, but this feature requires backend integration. For now, you can manually select sessions from the sidebar! 🔄`,
              timestamp: new Date(),
              type: 'text'
            };
            setMessages(prev => [...prev, assistantMessage]);
            sessionSwitched = true;
            break;
          }
        }
      }

      if (!sessionSwitched) {
        const aiResponse = await geminiService.getChatResponse(currentInput, context);

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
          type: 'text'
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      toast.error('Failed to get Sydney\'s response');
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I\'m having trouble right now. Please try again in a moment! 🤖',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsLoading(true);
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `📷 Uploaded trading screenshot: ${file.name}`,
      timestamp: new Date(),
      type: 'image'
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        try {
          const analysisResult = await geminiService.extractTradeDataFromImage(base64);
          
          let responseContent = '📊 **Trade Screenshot Analysis:**\n\n';
          
          if (analysisResult) {
            responseContent += `**Extracted Trade Data:**\n`;
            responseContent += `• Symbol: ${analysisResult.symbol || 'Not detected'}\n`;
            responseContent += `• Type: ${analysisResult.type || 'Not detected'}\n`;
            responseContent += `• Volume: ${analysisResult.volumeLot || 'Not detected'}\n`;
            responseContent += `• Open Price: ${analysisResult.openPrice || 'Not detected'}\n`;
            responseContent += `• Close Price: ${analysisResult.closePrice || 'Not detected'}\n`;
            responseContent += `• P&L: $${analysisResult.pnlUsd || 'Not detected'}\n\n`;
            
            responseContent += '💡 I can help you add this trade to your session! The trade form should now be auto-populated with this data.';
            
            // Notify parent component about extracted trade data
            if (onTradeDataExtracted) {
              onTradeDataExtracted(analysisResult);
            }
          } else {
            responseContent += '❌ I couldn\'t extract clear trade data from this screenshot. Here are some tips for better results:\n\n';
            responseContent += '• Ensure the screenshot shows clear profit/loss numbers\n';
            responseContent += '• Make sure currency pairs or symbols are visible\n';
            responseContent += '• Check that entry/exit prices are readable\n';
            responseContent += '• Try cropping to focus on the trade details\n\n';
            responseContent += 'Feel free to try again with a clearer image! 📸';
          }

          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: responseContent,
            timestamp: new Date(),
            type: 'analysis'
          };

          setMessages(prev => [...prev, assistantMessage]);
          toast.success('Screenshot analyzed successfully!');
        } catch (error) {
          throw error;
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to analyze screenshot');
      console.error('Screenshot analysis error:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ I had trouble analyzing that screenshot. Please make sure the image shows clear trading information and try again!',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setShowImageUpload(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    const greeting = getPersonalizedGreeting();
    const greetingMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
      type: 'text'
    };
    setMessages([greetingMessage]);
  };

  const getMessageIcon = (message: ChatMessage) => {
    if (message.role === 'user') {
      return message.type === 'image' ? <ImageIcon className="w-3 h-3 text-white" /> : <User className="w-3 h-3 text-white" />;
    }
    return message.type === 'analysis' ? <BarChart3 className="w-3 h-3 text-white" /> : <SydneyAvatar className="w-3 h-3" />;
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        height: isMinimized ? 'auto' : '600px'
      }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 w-96 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center">
          <SydneyAvatar className="w-8 h-8 mr-3" />
          <div>
            <h3 className="text-white font-medium">Sydney</h3>
            <p className="text-slate-400 text-xs">Your AI Trading Assistant</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col flex-1"
          >
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto max-h-96 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-2 max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    <div className={`p-2 rounded-full ${
                      message.role === 'user' 
                        ? 'bg-blue-600' 
                        : 'bg-gradient-to-br from-purple-500 to-pink-500'
                    }`}>
                      {getMessageIcon(message)}
                    </div>
                    <div className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.type === 'analysis'
                        ? 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-slate-100'
                        : 'bg-slate-700 text-slate-100'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex items-start space-x-2">
                    <SydneyAvatar className="w-8 h-8" />
                    <div className="p-3 rounded-lg bg-slate-700 text-slate-100">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Sydney is thinking...</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Image Upload Section */}
            {showImageUpload && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 border-t border-slate-700"
              >
                <DragDropUpload
                  onFileUpload={handleImageUpload}
                  accept="image/*"
                  maxSize={10}
                  className="mb-2"
                />
                <button
                  onClick={() => setShowImageUpload(false)}
                  className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
                >
                  Cancel upload
                </button>
              </motion.div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask Sydney anything about trading..."
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={() => setShowImageUpload(!showImageUpload)}
                  className={`p-2 rounded-lg transition-colors ${
                    showImageUpload 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  title="Upload trading screenshot"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              
              {messages.length > 1 && (
                <button
                  onClick={clearChat}
                  className="text-xs text-slate-400 hover:text-slate-300 mt-2 transition-colors"
                >
                  Clear chat
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EnhancedChatInterface;