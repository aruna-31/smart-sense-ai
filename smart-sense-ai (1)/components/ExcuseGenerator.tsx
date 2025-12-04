
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateExcuse, textToSpeech, generateApology, generateEmail, generateLetter } from '../services/geminiService';
import { AnimatedPage } from './AnimatedPage';
import { ExcuseMode, ApologyTone, EmailTone, LetterTone, WriterTool } from '../types';
import { VolumeUpIcon, SparklesIcon, CopyIcon, CheckIcon, ExportIcon, MicIcon } from './icons';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

const tools: { id: WriterTool; name: string }[] = [
    { id: 'excuse', name: 'Excuse Generator' },
    { id: 'apology', name: 'Apology Generator' },
    { id: 'email', name: 'Email Assistant' },
    { id: 'letter', name: 'Letter Writer' },
];

const excuseModes: ExcuseMode[] = ['Believable', 'Funny', 'Urgent', 'Professional'];
const apologyTones: ApologyTone[] = ['Sincere', 'Formal', 'Casual'];
const emailTones: EmailTone[] = ['Formal', 'Casual', 'Friendly', 'Urgent'];
const letterTones: LetterTone[] = ['Formal', 'Informal', 'Friendly'];

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

// FIX: Moved component definition outside the main component to prevent re-rendering and losing focus on input.
const TextAreaWithMic: React.FC<{
    id: string,
    value: string,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void,
    placeholder: string,
    rows: number,
    isListening: boolean,
    activeInput: string | null,
    onMicClick: (id: string) => void,
}> = ({ id, value, onChange, placeholder, rows, isListening, activeInput, onMicClick }) => (
    <div className="relative">
        <textarea id={id} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-gray-900/70 border border-gray-600 rounded-lg p-3 pr-10 focus:ring-2 focus:ring-brand-purple focus:border-brand-purple transition-colors duration-200 resize-none" rows={rows} />
        <button onClick={() => onMicClick(id)} className={`absolute right-2 top-2 p-1 rounded-full ${isListening && activeInput === id ? 'bg-red-500/50 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
            <MicIcon />
        </button>
    </div>
);

export const SmartExcuseGenerator: React.FC = () => {
    const [activeTool, setActiveTool] = useState<WriterTool>('excuse');
    const [result, setResult] = useState<{ text: string, percentage?: number, emoji?: string }>({ text: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);

    // State for inputs
    const [excuseSituation, setExcuseSituation] = useState('');
    const [excuseMode, setExcuseMode] = useState<ExcuseMode>('Believable');
    const [apologySituation, setApologySituation] = useState('');
    const [apologyTone, setApologyTone] = useState<ApologyTone>('Sincere');
    const [emailTo, setEmailTo] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailPoints, setEmailPoints] = useState('');
    const [emailTone, setEmailTone] = useState<EmailTone>('Formal');
    const [letterTo, setLetterTo] = useState('');
    const [letterFrom, setLetterFrom] = useState('');
    const [letterPoints, setLetterPoints] = useState('');
    const [letterTone, setLetterTone] = useState<LetterTone>('Formal');
    
    const [activeInput, setActiveInput] = useState<string | null>(null);
    const { transcript, isListening, startListening, stopListening } = useSpeechRecognition();

    useEffect(() => {
        if (transcript && activeInput) {
            switch (activeInput) {
                case 'excuseSituation': setExcuseSituation(transcript); break;
                case 'apologySituation': setApologySituation(transcript); break;
                case 'emailPoints': setEmailPoints(transcript); break;
                case 'letterPoints': setLetterPoints(transcript); break;
            }
        }
    }, [transcript, activeInput]);
    
    const handleMicClick = (inputId: string) => {
        if (isListening) {
            stopListening();
            setActiveInput(null);
        } else {
            setActiveInput(inputId);
            startListening();
        }
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setResult({ text: '' });
        let generatedResult: any = '';

        switch (activeTool) {
            case 'excuse':
                if (!excuseSituation) break;
                generatedResult = await generateExcuse(excuseSituation, excuseMode);
                break;
            case 'apology':
                if (!apologySituation) break;
                generatedResult = await generateApology(apologySituation, apologyTone);
                break;
            case 'email':
                if (!emailTo || !emailSubject || !emailPoints) break;
                generatedResult = { text: await generateEmail(emailTo, emailSubject, emailPoints, emailTone) };
                break;
            case 'letter':
                if (!letterTo || !letterFrom || !letterPoints) break;
                generatedResult = { text: await generateLetter(letterTo, letterFrom, letterPoints, letterTone) };
                break;
        }

        setResult(generatedResult);
        setIsLoading(false);

        if (generatedResult.emoji) {
            setFloatingEmojis(prev => [...prev, { id: Date.now(), emoji: generatedResult.emoji, x: Math.random() * 80 + 10 }]);
        }
    };

    const handleSpeak = async () => {
        if (!result.text) return;
        setIsSpeaking(true);
        await textToSpeech(result.text);
        setIsSpeaking(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(result.text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };
    
    const handleExport = () => {
        exportTextAsFile(result.text, `${activeTool}_result.txt`);
    };

    const renderForm = () => {
        const commonTextAreaProps = {
            isListening,
            activeInput,
            onMicClick: handleMicClick,
        };

        switch (activeTool) {
            case 'excuse': return (
                <div className="space-y-6">
                    <div>
                        <label htmlFor="excuseSituation" className="block text-sm font-medium text-gray-300 mb-2">What's the situation?</label>
                        <TextAreaWithMic id="excuseSituation" value={excuseSituation} onChange={(e) => setExcuseSituation(e.target.value)} placeholder="e.g., I need to get out of a meeting..." rows={3} {...commonTextAreaProps} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Select a mode</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {excuseModes.map((m) => (<button key={m} onClick={() => setExcuseMode(m)} className={`px-4 py-2 rounded-lg font-semibold text-center transition-all duration-200 ${excuseMode === m ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg scale-105' : 'bg-gray-700 hover:bg-gray-600'}`}>{m}</button>))}
                        </div>
                    </div>
                </div>
            );
            case 'apology': return (
                <div className="space-y-6">
                    <div>
                        <label htmlFor="apologySituation" className="block text-sm font-medium text-gray-300 mb-2">What are you apologizing for?</label>
                        <TextAreaWithMic id="apologySituation" value={apologySituation} onChange={(e) => setApologySituation(e.target.value)} placeholder="e.g., I forgot our anniversary..." rows={3} {...commonTextAreaProps} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Select a tone</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {apologyTones.map((t) => (<button key={t} onClick={() => setApologyTone(t)} className={`px-4 py-2 rounded-lg font-semibold text-center transition-all duration-200 ${apologyTone === t ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg scale-105' : 'bg-gray-700 hover:bg-gray-600'}`}>{t}</button>))}
                        </div>
                    </div>
                </div>
            );
            case 'email': return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label htmlFor="emailTo" className="block text-sm font-medium text-gray-300 mb-2">Recipient</label><input id="emailTo" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="e.g., team@example.com" className="w-full bg-gray-900/70 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-brand-purple focus:border-brand-purple" /></div>
                        <div><label htmlFor="emailSubject" className="block text-sm font-medium text-gray-300 mb-2">Subject</label><input id="emailSubject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="e.g., Project Update" className="w-full bg-gray-900/70 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-brand-purple" /></div>
                    </div>
                    <div><label htmlFor="emailPoints" className="block text-sm font-medium text-gray-300 mb-2">Key Points</label><TextAreaWithMic id="emailPoints" value={emailPoints} onChange={(e) => setEmailPoints(e.target.value)} placeholder="e.g., Finished mockups..." rows={4} {...commonTextAreaProps} /></div>
                    <div><label className="block text-sm font-medium text-gray-300 mb-2">Select a tone</label><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{emailTones.map((t) => (<button key={t} onClick={() => setEmailTone(t)} className={`px-4 py-2 rounded-lg font-semibold text-center transition-all duration-200 ${emailTone === t ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg scale-105' : 'bg-gray-700 hover:bg-gray-600'}`}>{t}</button>))}</div></div>
                </div>
            );
            case 'letter': return (
                 <div className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div><label htmlFor="letterTo" className="block text-sm font-medium text-gray-300 mb-2">Recipient</label><input id="letterTo" value={letterTo} onChange={(e) => setLetterTo(e.target.value)} placeholder="e.g., Hiring Manager" className="w-full bg-gray-900/70 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-brand-purple" /></div>
                         <div><label htmlFor="letterFrom" className="block text-sm font-medium text-gray-300 mb-2">From</label><input id="letterFrom" value={letterFrom} onChange={(e) => setLetterFrom(e.target.value)} placeholder="e.g., Jane Doe" className="w-full bg-gray-900/70 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-brand-purple" /></div>
                     </div>
                     <div><label htmlFor="letterPoints" className="block text-sm font-medium text-gray-300 mb-2">Key Points</label><TextAreaWithMic id="letterPoints" value={letterPoints} onChange={(e) => setLetterPoints(e.target.value)} placeholder="e.g., Express interest in role..." rows={4} {...commonTextAreaProps} /></div>
                     <div><label className="block text-sm font-medium text-gray-300 mb-2">Select a tone</label><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{letterTones.map((t) => (<button key={t} onClick={() => setLetterTone(t)} className={`px-4 py-2 rounded-lg font-semibold text-center transition-all duration-200 ${letterTone === t ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg scale-105' : 'bg-gray-700 hover:bg-gray-600'}`}>{t}</button>))}</div></div>
                 </div>
            );
        }
    };

    return (
        <AnimatedPage>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold font-poppins bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-pink mb-4">
                    SMART Excuse Generator
                </h1>
                <p className="text-gray-400 mb-8 text-lg">
                    Your AI studio for writing excuses, apologies, emails, and letters.
                </p>

                <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-700/50">
                    <div className="flex items-center gap-2 border-b border-gray-700/50 mb-6 overflow-x-auto pb-2">
                        {tools.map(tool => (
                            <button key={tool.id} onClick={() => { setActiveTool(tool.id); setResult({text:''})}} className={`px-4 py-2 font-semibold transition-colors duration-200 border-b-2 whitespace-nowrap ${activeTool === tool.id ? 'border-brand-pink text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>
                                {tool.name}
                            </button>
                        ))}
                    </div>
                    
                    <AnimatePresence mode="wait">
                      <motion.div key={activeTool} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                        {renderForm()}
                      </motion.div>
                    </AnimatePresence>

                    <motion.button onClick={handleGenerate} disabled={isLoading} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-purple to-brand-pink text-white font-bold py-3 px-4 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? 'Generating...' : 'Generate'} <SparklesIcon />
                    </motion.button>
                </div>

                {(isLoading || result.text) && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative mt-8 bg-gray-800/50 p-6 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-700/50 overflow-hidden">
                        <AnimatePresence>
                            {floatingEmojis.map(item => (
                                <motion.span
                                    key={item.id}
                                    initial={{ bottom: '5%', opacity: 1, scale: 0.5 }}
                                    animate={{ bottom: '100%', opacity: 0, scale: 1.5 }}
                                    transition={{ duration: 2, ease: 'easeOut' }}
                                    onAnimationComplete={() => {
                                        setFloatingEmojis(prev => prev.filter(e => e.id !== item.id));
                                    }}
                                    className="absolute text-5xl pointer-events-none"
                                    style={{ left: `${item.x}%` }}
                                    aria-hidden="true"
                                >
                                    {item.emoji}
                                </motion.span>
                            ))}
                        </AnimatePresence>

                        <h2 className="text-xl font-bold mb-4 font-poppins">Your Result:</h2>
                        {isLoading ? (
                            <div className="flex items-center justify-center space-x-2"><div className="w-3 h-3 rounded-full bg-brand-purple animate-pulse [animation-delay:-0.3s]"></div><div className="w-3 h-3 rounded-full bg-brand-purple animate-pulse [animation-delay:-0.15s]"></div><div className="w-3 h-3 rounded-full bg-brand-purple animate-pulse"></div></div>
                        ) : (
                            <>
                                {result.percentage && result.emoji && (
                                  <div className="flex items-center gap-4 bg-gray-900/50 p-3 rounded-lg mb-4">
                                    <span className="text-3xl">{result.emoji}</span>
                                    <div className="w-full">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-semibold text-gray-300">{activeTool === 'excuse' ? 'Believability' : 'Sincerity'}</span>
                                        <span className="font-bold text-brand-pink">{result.percentage}%</span>
                                      </div>
                                      <div className="w-full bg-gray-700 rounded-full h-2.5"><div className="bg-gradient-to-r from-brand-purple to-brand-pink h-2.5 rounded-full" style={{width: `${result.percentage}%`}}></div></div>
                                    </div>
                                  </div>
                                )}
                                <p className="text-gray-200 text-lg leading-relaxed whitespace-pre-wrap">{result.text}</p>
                                <div className="flex items-center gap-4 mt-6 border-t border-gray-700 pt-4">
                                    <button onClick={handleSpeak} disabled={isSpeaking} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200 disabled:opacity-50"><VolumeUpIcon /> {isSpeaking ? 'Speaking...' : 'Speak'}</button>
                                    <button onClick={handleCopy} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200">{isCopied ? <CheckIcon /> : <CopyIcon />} {isCopied ? 'Copied!' : 'Copy'}</button>
                                    <button onClick={handleExport} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200"><ExportIcon /> Export</button>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </div>
        </AnimatedPage>
    );
};
