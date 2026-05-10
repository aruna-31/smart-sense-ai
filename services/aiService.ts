/**
 * aiService.ts — Smart Sense AI frontend service layer
 *
 * Why: All AI calls go through the local FastAPI backend (localhost:8001)
 *      which forwards them to Ollama. No cloud, no API keys, fully offline.
 *
 * Same function signatures as the old geminiService.ts so components need
 * zero changes — only the import path changes.
 */

import { ExcuseMode, ApologyTone, EmailTone, LetterTone, Language } from '../types';

// Local backend URL — always localhost for this demo project
const BACKEND_URL = 'http://localhost:8001';

// ── Core fetch helper ─────────────────────────────────────────────────────────
async function callBackend(payload: Record<string, unknown>): Promise<{ text: string }> {
    const resp = await fetch(`${BACKEND_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Backend error ${resp.status}: ${err}`);
    }

    const data = await resp.json();
    return { text: data.text ?? '' };
}

// ── Excuse Generator ──────────────────────────────────────────────────────────
export const generateExcuse = async (
    situation: string,
    mode: ExcuseMode
): Promise<{ text: string; percentage: number; emoji: string }> => {
    try {
        const res = await callBackend({ feature: 'excuse', situation, mode });
        // Parse "Believability: 85%" and emoji from the response text
        const percentMatch = res.text.match(/(\d+)%/);
        const emojiMatch = res.text.match(/[\u{1F300}-\u{1FFFF}]/u);
        const percentage = percentMatch ? parseInt(percentMatch[1]) : 75;
        const emoji = emojiMatch ? emojiMatch[0] : '🤖';
        return { text: res.text, percentage, emoji };
    } catch (error) {
        console.error('generateExcuse error:', error);
        return { text: `Sorry, I couldn't generate an excuse. Is Ollama running? (ollama serve)`, percentage: 0, emoji: '❌' };
    }
};

// ── Apology Generator ─────────────────────────────────────────────────────────
export const generateApology = async (
    situation: string,
    tone: ApologyTone
): Promise<{ text: string; percentage: number; emoji: string }> => {
    try {
        const res = await callBackend({ feature: 'apology', situation, mode: tone });
        const percentMatch = res.text.match(/(\d+)%/);
        const emojiMatch = res.text.match(/[\u{1F300}-\u{1FFFF}]/u);
        const percentage = percentMatch ? parseInt(percentMatch[1]) : 80;
        const emoji = emojiMatch ? emojiMatch[0] : '🙏';
        return { text: res.text, percentage, emoji };
    } catch (error) {
        console.error('generateApology error:', error);
        return { text: `Sorry, I couldn't generate an apology. Is Ollama running? (ollama serve)`, percentage: 0, emoji: '❌' };
    }
};

// ── Email Writer ──────────────────────────────────────────────────────────────
export const generateEmail = async (
    to: string,
    subject: string,
    points: string,
    tone: EmailTone
): Promise<string> => {
    try {
        const res = await callBackend({ feature: 'email', to, subject, points, tone });
        return res.text;
    } catch (error) {
        console.error('generateEmail error:', error);
        return 'Error generating email. Make sure Ollama is running (ollama serve).';
    }
};

// ── Letter Writer ─────────────────────────────────────────────────────────────
export const generateLetter = async (
    to: string,
    from: string,
    points: string,
    tone: LetterTone
): Promise<string> => {
    try {
        const res = await callBackend({ feature: 'letter', to, points, tone });
        return res.text;
    } catch (error) {
        console.error('generateLetter error:', error);
        return 'Error generating letter. Make sure Ollama is running (ollama serve).';
    }
};

// ── Summarizer ────────────────────────────────────────────────────────────────
export type SummaryLength = 'Short' | 'Medium' | 'Detailed';

export const summarizeText = async (text: string, length: SummaryLength): Promise<string> => {
    try {
        const res = await callBackend({ feature: 'summarize', text, mode: length });
        return res.text;
    } catch (error) {
        console.error('summarizeText error:', error);
        return 'Error summarizing. Make sure Ollama is running (ollama serve).';
    }
};

// ── Learning Hub ──────────────────────────────────────────────────────────────
export const generateLearningRoadmap = async (topic: string): Promise<string> => {
    try {
        const res = await callBackend({ feature: 'learn', topic });
        return res.text;
    } catch (error) {
        console.error('generateLearningRoadmap error:', error);
        return 'Error generating roadmap. Make sure Ollama is running (ollama serve).';
    }
};

// ── Medical Generator ─────────────────────────────────────────────────────────
export const generateMedicalInfo = async (
    condition: string,
    audience: 'Patient' | 'Student'
): Promise<string> => {
    try {
        const res = await callBackend({ feature: 'medical', condition, audience });
        return res.text;
    } catch (error) {
        console.error('generateMedicalInfo error:', error);
        return 'Error generating medical information. Make sure Ollama is running (ollama serve).';
    }
};

// ── Voice Translator ──────────────────────────────────────────────────────────
export const translateText = async (text: string, from: Language, to: Language): Promise<string> => {
    try {
        const res = await callBackend({ feature: 'translate', text, from_lang: from, to_lang: to });
        return res.text;
    } catch (error) {
        console.error('translateText error:', error);
        return 'Error translating. Make sure Ollama is running (ollama serve).';
    }
};

// ── Text to Speech (browser Web Speech API) ───────────────────────────────────
// Why: Replaced Gemini TTS (which required an API key) with the built-in browser
//      SpeechSynthesis API. Works offline, zero cost, available in all modern browsers.
export const textToSpeech = async (text: string): Promise<void> => {
    if (!('speechSynthesis' in window)) {
        console.warn('Browser does not support Web Speech API');
        return;
    }
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.localService);
    if (englishVoice) utterance.voice = englishVoice;

    window.speechSynthesis.speak(utterance);
};
