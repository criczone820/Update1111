import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { aiService } from '../../services/aiService';

// Sydney Avatar Component
const SydneyAvatar = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center`}>
    <svg viewBox="0 0 24 24" fill="none" className="w-3/4 h-3/4 text-white">
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2Z" fill="currentColor"/>
      <path d="M21 9V7L15 1H5C3.89 1 3 1.89 3 3V7H1V9H3V15C3 16.1 3.9 17 5 17V19C5 20.1 5.9 21 7 21H9C10.1 21 11 20.1 11 19V17H13V19C13 20.1 13.9 21 15 21H17C18.1 21 19 20.1 19 19V17C20.1 17 21 16.1 21 15V9H21ZM7 3H15L19 7V15H5V3H7Z" fill="currentColor"/>
    </svg>
  </div>
);

interface SydneyGreetingProps {
  userName?: string;
}

const SydneyGreeting: React.FC<SydneyGreetingProps> = ({ userName }) => {
  // Use useMemo to ensure greeting is stable and doesn't change on re-renders
  const greeting = useMemo(() => {
    return aiService.getGreeting(userName);
  }, [userName]); // Only recalculate if userName changes

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-xl p-4 mb-6"
    >
      <div className="flex items-center space-x-3">
        <SydneyAvatar />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-purple-400 font-medium text-sm">Sydney</span>
            <span className="text-slate-500 text-xs">•</span>
            <span className="text-slate-400 text-xs">AI Assistant</span>
          </div>
          <p className="text-slate-200 text-sm mt-1 font-medium">{greeting}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default SydneyGreeting;