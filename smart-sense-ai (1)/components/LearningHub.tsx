
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatedPage } from './AnimatedPage';
import { generateLearningRoadmap } from '../services/geminiService';
import { SparklesIcon, ExportIcon, MicIcon } from './icons';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

const exportTextAsFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const markdownToHtml = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\* (.*?)(?=\n\* |\n\n|$)/g, '<li>$1</li>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand-pink hover:underline">$1</a>')
    .replace(/(\r\n|\n|\r)/gm, "<br>");
};

export const LearningHub: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [roadmap, setRoadmap] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { transcript, isListening, startListening, stopListening } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
        setTopic(transcript);
    }
  }, [transcript]);

  const handleMicClick = () => {
      isListening ? stopListening() : startListening();
  };

  const handleGenerate = async () => {
    if (!topic) return;
    setIsLoading(true);
    setRoadmap('');
    const result = await generateLearningRoadmap(topic);
    setRoadmap(result);
    setIsLoading(false);
  };

  const handleExport = () => {
    exportTextAsFile(roadmap, `learning_roadmap_${topic.replace(/\s+/g, '_')}.txt`);
  };

  return (
    <AnimatedPage>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold font-poppins bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-pink mb-4">
          Learning Hub
        </h1>
        <p className="text-gray-400 mb-8 text-lg">
          Enter any topic and get a customized, step-by-step learning plan with resources from our AI mentor.
        </p>

        <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-700/50">
          <div className="space-y-4">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-2">
                What do you want to learn?
              </label>
              <div className="relative">
                <input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Quantum Physics, React.js, Ancient Roman History..."
                  className="w-full bg-gray-900/70 border border-gray-600 rounded-lg p-3 pr-10 focus:ring-2 focus:ring-brand-purple focus:border-brand-purple transition-colors duration-200"
                />
                <button onClick={handleMicClick} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full ${isListening ? 'bg-red-500/50 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                  <MicIcon />
                </button>
              </div>
            </div>
            
            <motion.button
              onClick={handleGenerate}
              disabled={isLoading || !topic}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold py-3 px-4 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Generating Plan...' : 'Generate Roadmap'} <SparklesIcon />
            </motion.button>
          </div>
        </div>
        
        {(isLoading || roadmap) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-gray-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-700/50"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold font-poppins">Your Learning Roadmap:</h2>
              {!isLoading && roadmap && (
                <button onClick={handleExport} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200">
                  <ExportIcon /> Export
                </button>
              )}
            </div>
            {isLoading ? (
               <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-brand-purple animate-pulse [animation-delay:-0.3s]"></div>
                <div className="w-3 h-3 rounded-full bg-brand-purple animate-pulse [animation-delay:-0.15s]"></div>
                <div className="w-3 h-3 rounded-full bg-brand-purple animate-pulse"></div>
               </div>
            ) : (
                <div 
                    className="prose prose-invert max-w-none text-gray-200 text-lg leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(roadmap) }}
                />
            )}
          </motion.div>
        )}
      </div>
    </AnimatedPage>
  );
};
