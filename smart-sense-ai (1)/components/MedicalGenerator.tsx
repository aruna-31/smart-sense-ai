
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatedPage } from './AnimatedPage';
import { generateMedicalInfo } from '../services/geminiService';
import { SparklesIcon, ExportIcon, MicIcon } from './icons';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

type Audience = 'Patient' | 'Student';
const audiences: Audience[] = ['Patient', 'Student'];

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

export const MedicalGenerator: React.FC = () => {
  const [condition, setCondition] = useState('');
  const [audience, setAudience] = useState<Audience>('Patient');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { transcript, isListening, startListening, stopListening } = useSpeechRecognition();
  
  useEffect(() => {
    if (transcript) {
        setCondition(transcript);
    }
  }, [transcript]);

  const handleMicClick = () => {
      isListening ? stopListening() : startListening();
  };

  const handleGenerate = async () => {
    if (!condition) return;
    setIsLoading(true);
    setDescription('');
    const result = await generateMedicalInfo(condition, audience);
    setDescription(result);
    setIsLoading(false);
  };
  
  const handleExport = () => {
    exportTextAsFile(description, `medical_info_${condition.replace(/\s+/g, '_')}.txt`);
  };

  return (
    <AnimatedPage>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold font-poppins bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-pink mb-4">
          Medical Information Generator
        </h1>
        <p className="text-gray-400 mb-6 text-lg">
          An educational tool to generate simplified medical info or fake student medical notes.
        </p>
        
        <div className="bg-red-900/50 border border-red-700/80 text-red-200 p-4 rounded-lg mb-8">
          <p className="font-bold">Disclaimer:</p>
          <p className="text-sm">This is an AI-powered educational tool, not a substitute for professional medical advice. Information may be inaccurate. Always consult a qualified healthcare professional for any medical concerns.</p>
        </div>

        <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-700/50">
          <div className="space-y-6">
            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-gray-300 mb-2">
                Medical Condition / Reason for Leave
              </label>
              <div className="relative">
                <input
                  id="condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="e.g., Type 2 Diabetes, Stomach Pain..."
                  className="w-full bg-gray-900/70 border border-gray-600 rounded-lg p-3 pr-10 focus:ring-2 focus:ring-brand-purple focus:border-brand-purple transition-colors duration-200"
                />
                <button onClick={handleMicClick} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full ${isListening ? 'bg-red-500/50 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                  <MicIcon />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Purpose</label>
              <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setAudience('Patient')} className={`px-4 py-2 rounded-lg font-semibold text-center transition-all duration-200 ${audience === 'Patient' ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg scale-105' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    For a Patient
                  </button>
                  <button onClick={() => setAudience('Student')} className={`px-4 py-2 rounded-lg font-semibold text-center transition-all duration-200 ${audience === 'Student' ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg scale-105' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    For a Student Note
                  </button>
              </div>
            </div>
            
            <motion.button
              onClick={handleGenerate}
              disabled={isLoading || !condition}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold py-3 px-4 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Generating...' : 'Generate Description'} <SparklesIcon />
            </motion.button>
          </div>
        </div>
        
        {(isLoading || description) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-gray-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-700/50"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold font-poppins">Generated Information:</h2>
              {!isLoading && description && (
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
              <p className="text-gray-200 text-lg leading-relaxed whitespace-pre-wrap">{description}</p>
            )}
          </motion.div>
        )}
      </div>
    </AnimatedPage>
  );
};
