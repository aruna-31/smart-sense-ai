
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatedPage } from './AnimatedPage';
import { translateText, textToSpeech } from '../services/geminiService';
import { MicIcon, VolumeUpIcon, SparklesIcon } from './icons';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { Language, languageCodeMap } from '../types';

const languages: Language[] = ['English', 'Hindi', 'Telugu', 'Urdu', 'Tamil', 'Kannada', 'Spanish', 'French', 'German', 'Japanese', 'Russian'];

export const VoiceTranslator: React.FC = () => {
    const [fromLang, setFromLang] = useState<Language>('English');
    const [toLang, setToLang] = useState<Language>('Hindi');
    const [inputText, setInputText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { transcript, isListening, startListening, stopListening, setLanguage } = useSpeechRecognition();

    useEffect(() => {
        setLanguage(languageCodeMap[fromLang]);
    }, [fromLang, setLanguage]);

    useEffect(() => {
        if (transcript) {
            setInputText(transcript);
        }
    }, [transcript]);
    
    useEffect(() => {
        if (!isListening && inputText) {
            handleTranslate();
        }
    }, [isListening, inputText]);


    const handleMicClick = () => {
        if (isListening) {
            stopListening();
        } else {
            setInputText('');
            setTranslatedText('');
            startListening();
        }
    };
    
    const handleTranslate = async () => {
        if (!inputText.trim()) return;
        setIsLoading(true);
        setTranslatedText('');
        const result = await translateText(inputText, fromLang, toLang);
        setTranslatedText(result);
        setIsLoading(false);
    };
    
    const handleSpeak = () => {
        if (translatedText) {
            textToSpeech(translatedText);
        }
    };

    return (
        <AnimatedPage>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold font-poppins bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-pink mb-4">
                    Voice Translator
                </h1>
                <p className="text-gray-400 mb-8 text-lg">
                    Speak in one language, and let AI translate to another.
                </p>

                <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-700/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label htmlFor="from-lang" className="block text-sm font-medium text-gray-300 mb-2">From</label>
                            <select id="from-lang" value={fromLang} onChange={e => setFromLang(e.target.value as Language)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-brand-purple">
                                {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="to-lang" className="block text-sm font-medium text-gray-300 mb-2">To</label>
                            <select id="to-lang" value={toLang} onChange={e => setToLang(e.target.value as Language)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-brand-purple">
                                {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="text-center">
                        <motion.button onClick={handleMicClick} whileTap={{ scale: 0.9 }} className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-300 mx-auto ${isListening ? 'bg-red-500' : 'bg-gradient-to-r from-brand-purple to-brand-pink'}`}>
                            <MicIcon />
                            {isListening && <div className="absolute inset-0 rounded-full bg-white/30 animate-ping"></div>}
                        </motion.button>
                        <p className="mt-4 text-gray-400">{isListening ? 'Listening...' : 'Tap to Speak'}</p>
                    </div>
                </div>

                {(inputText || translatedText || isLoading) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-700/50">
                            <h3 className="font-bold text-lg mb-2">{fromLang} (Heard)</h3>
                            <p className="text-gray-200 min-h-[50px]">{inputText || '...'}</p>
                        </div>
                        <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-700/50">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-lg mb-2">{toLang} (Translation)</h3>
                                {!isLoading && translatedText && (
                                    <button onClick={handleSpeak} className="text-gray-400 hover:text-white"><VolumeUpIcon /></button>
                                )}
                            </div>
                            {isLoading ? (
                                <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded-full bg-brand-purple animate-pulse [animation-delay:-0.3s]"></div><div className="w-2 h-2 rounded-full bg-brand-purple animate-pulse [animation-delay:-0.15s]"></div><div className="w-2 h-2 rounded-full bg-brand-purple animate-pulse"></div></div>
                            ) : (
                                <p className="text-gray-200 min-h-[50px]">{translatedText || '...'}</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>
        </AnimatedPage>
    );
};
