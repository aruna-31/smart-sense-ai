import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatedPage } from './AnimatedPage';
import { summarizeText } from '../services/geminiService';
import { SparklesIcon } from './icons';

type SummaryLength = 'Short' | 'Medium' | 'Detailed';
const lengths: SummaryLength[] = ['Short', 'Medium', 'Detailed'];

export const ProductivitySuite: React.FC = () => {
  const [text, setText] = useState('');
  const [length, setLength] = useState<SummaryLength>('Medium');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!text) return;
    setIsLoading(true);
    setSummary('');
    const result = await summarizeText(text, length);
    setSummary(result);
    setIsLoading(false);
  };

  return (
    <AnimatedPage>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold font-poppins bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-pink mb-4">
          Productivity Suite
        </h1>
        <p className="text-gray-400 mb-8 text-lg">
          Your toolkit for working smarter. Start by summarizing any text in seconds.
        </p>

        <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-700/50">
          <div className="space-y-6">
            <div>
              <label htmlFor="text-to-summarize" className="block text-sm font-medium text-gray-300 mb-2">
                Text to Summarize
              </label>
              <textarea
                id="text-to-summarize"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your article, report, or any long text here..."
                className="w-full bg-gray-900/70 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-brand-purple focus:border-brand-purple transition-colors duration-200 resize-none"
                rows={10}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Summary Length</label>
              <div className="grid grid-cols-3 gap-3">
                {lengths.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLength(l)}
                    className={`px-4 py-2 rounded-lg font-semibold text-center transition-all duration-200 ${
                      length === l
                        ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg scale-105'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            
            <motion.button
              onClick={handleGenerate}
              disabled={isLoading || !text}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold py-3 px-4 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Summarizing...' : 'Summarize Text'} <SparklesIcon />
            </motion.button>
          </div>
        </div>
        
        {(isLoading || summary) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-gray-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-700/50"
          >
            <h2 className="text-xl font-bold mb-4 font-poppins">Summary:</h2>
            {isLoading ? (
               <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-brand-purple animate-pulse [animation-delay:-0.3s]"></div>
                <div className="w-3 h-3 rounded-full bg-brand-purple animate-pulse [animation-delay:-0.15s]"></div>
                <div className="w-3 h-3 rounded-full bg-brand-purple animate-pulse"></div>
               </div>
            ) : (
                <p className="text-gray-200 text-lg leading-relaxed whitespace-pre-wrap">{summary}</p>
            )}
          </motion.div>
        )}
      </div>
    </AnimatedPage>
  );
};
