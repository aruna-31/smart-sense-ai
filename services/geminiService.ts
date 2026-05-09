
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ExcuseMode, ApologyTone, EmailTone, LetterTone, Language } from '../types';

// All generation now goes through the backend API to centralize keys and rate-limiting.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || '';

// Helper function to call the backend generate endpoint
async function callBackendGenerate(prompt: string, model?: string, max_tokens?: number) {
    return await callBackendGeneratePayload({ prompt, model, max_tokens });
}

// New helper: send an arbitrary payload to backend /api/generate and handle 402
async function callBackendGeneratePayload(payload: any) {
    const resp = await fetch(`${BACKEND_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (resp.status === 402) {
        // Payment required - include parsed JSON detail in the thrown error so UI can react
        const payload = await resp.json().catch(() => null);
        const err: any = new Error('Payment required');
        err.status = 402;
        err.detail = payload;
        throw err;
    }

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Backend generate error ${resp.status}: ${text}`);
    }
    return await resp.json();
}

// Helper function to check for quota errors (kept for compatibility with error handlers)
function isQuotaError(error: any): boolean {
  return error?.error?.code === 429 || 
         error?.status === 'RESOURCE_EXHAUSTED' ||
         error?.message?.includes('quota') ||
         error?.message?.includes('429');
}

// Helper function to get retry delay from error
function getRetryDelay(error: any): number {
  try {
    const retryInfo = error?.error?.details?.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
    if (retryInfo?.retryDelay) {
      return Math.ceil(parseFloat(retryInfo.retryDelay.replace('s', '')));
    }
  } catch {}
  return 30; // Default 30 seconds
}

// FIX: Overload handleError to specify return types for different contexts, resolving type errors.
function handleError(error: any, context: 'generateExcuse' | 'generateApology'): {text: string; percentage: number; emoji: string;};
function handleError(error: any, context: string): string;
function handleError(error: any, context: string): string | { text: string; percentage: number; emoji: string; } {
  console.error(`Error in ${context}:`, error);
  
  // Handle quota errors with user-friendly messages
  if (isQuotaError(error)) {
    const retrySeconds = getRetryDelay(error);
    const quotaMessage = `⚠️ API quota exceeded. Please wait ${retrySeconds} seconds or check your plan at https://ai.dev/usage?tab=rate-limit`;
    const defaultErrorResponse = { text: quotaMessage, percentage: 0, emoji: '⏳' };
    
    if (context === 'generateExcuse' || context === 'generateApology') {
      return defaultErrorResponse;
    }
    return quotaMessage;
  }
  
  const defaultErrorResponse = { text: `Sorry, I encountered an error in ${context}. Please try again.`, percentage: 0, emoji: '😞' };
  
  if (context === 'generateExcuse' || context === 'generateApology') {
    return defaultErrorResponse;
  }
  return defaultErrorResponse.text;
}

const resultSchema = {
    type: Type.OBJECT,
    properties: {
        text: { type: Type.STRING, description: 'The generated content.' },
        percentage: { type: Type.INTEGER, description: 'A percentage score for the content (e.g., believability, sincerity).' },
        emoji: { type: Type.STRING, description: 'A single emoji that fits the tone of the content.' }
    },
    required: ['text', 'percentage', 'emoji']
};

export const generateExcuse = async (situation: string, mode: ExcuseMode): Promise<{text: string; percentage: number; emoji: string;}> => {
  try {
    const prompt = `Generate a ${mode.toLowerCase()} excuse for the following situation: "${situation}". Make it concise and creative. Also provide a believability percentage and a fitting emoji.`;
    const res = await callBackendGenerate(prompt);
    // backend may return different shapes: { text: '...', percentage: 50, emoji: '🙂' }
    // or { text: '{"text":"...","percentage":50,"emoji":"🙂"}' } (stringified JSON), or plain text.
    const candidate = res?.text ?? res;
    if (typeof candidate === 'string') {
      // If it's a JSON string, parse it; otherwise treat as plain text
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && parsed.text) return {
          text: String(parsed.text),
          percentage: Number(parsed.percentage ?? 0),
          emoji: String(parsed.emoji ?? '🤖')
        };
      } catch (e) {
        // Not JSON — fall through
      }
      return { text: String(candidate), percentage: 0, emoji: '🤖' };
    } else if (typeof candidate === 'object' && candidate !== null) {
      return {
        text: String(candidate.text ?? ''),
        percentage: Number((candidate as any).percentage ?? 0),
        emoji: String((candidate as any).emoji ?? '🤖')
      };
    }
    return { text: 'Sorry, could not parse response', percentage: 0, emoji: '❓' };
  } catch (error) {
    return handleError(error, 'generateExcuse');
  }
};


export const generateApology = async (situation: string, tone: ApologyTone): Promise<{text: string; percentage: number; emoji: string;}> => {
  try {
    const prompt = `Generate a ${tone.toLowerCase()} apology for: "${situation}". Make it heartfelt. Also provide a sincerity percentage and a fitting emoji.`;
    const res = await callBackendGenerate(prompt);
    const candidate = res?.text ?? res;
    if (typeof candidate === 'string') {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && parsed.text) return {
          text: String(parsed.text),
          percentage: Number(parsed.percentage ?? 0),
          emoji: String(parsed.emoji ?? '🤖')
        };
      } catch (e) {}
      return { text: String(candidate), percentage: 0, emoji: '🤖' };
    } else if (typeof candidate === 'object' && candidate !== null) {
      return {
        text: String(candidate.text ?? ''),
        percentage: Number((candidate as any).percentage ?? 0),
        emoji: String((candidate as any).emoji ?? '🤖')
      };
    }
    return { text: 'Sorry, could not parse response', percentage: 0, emoji: '❓' };
  } catch (error) {
    return handleError(error, 'generateApology');
  }
};

export const generateEmail = async (to: string, subject: string, points: string, tone: EmailTone): Promise<string> => {
    try {
        const prompt = `Compose a ${tone.toLowerCase()} email body with these details:\n- To: ${to}\n- Subject: ${subject}\n- Points: ${points}\nGenerate only the email body.`;
        const res = await callBackendGenerate(prompt);
        return res.text;
    } catch (error) {
        return handleError(error, 'generateEmail');
    }
};

export const generateLetter = async (to: string, from: string, points: string, tone: LetterTone): Promise<string> => {
    try {
        const prompt = `Compose a ${tone.toLowerCase()} letter body with these details:\n- To: ${to}\n- From: ${from}\n- Points: ${points}\nGenerate only the letter body.`;
        const res = await callBackendGenerate(prompt);
        return res.text;
    } catch (error) {
        return handleError(error, 'generateLetter');
    }
};

// FIX: Added missing summarizeText function used in ProductivitySuite component.
export type SummaryLength = 'Short' | 'Medium' | 'Detailed';

export const summarizeText = async (text: string, length: SummaryLength): Promise<string> => {
    try {
        const prompt = `Summarize the following text in a ${length.toLowerCase()} format:\n\n"${text}"`;
        const res = await callBackendGenerate(prompt);
        return res.text;
    } catch (error) {
        return handleError(error, 'summarizeText');
    }
};

export const generateLearningRoadmap = async (topic: string): Promise<string> => {
    try {
        const prompt = `Generate a structured, beginner-friendly learning roadmap for "${topic}". Include clear steps, key concepts, and suggest real, hyperlinked online resources (articles, videos, interactive tutorials, projects) for each step. Format as Markdown.`;
        const res = await callBackendGenerate(prompt);
        return res.text;
    } catch (error) {
        return handleError(error, 'generateLearningRoadmap');
    }
};

export const generateMedicalInfo = async (condition: string, audience: 'Patient' | 'Student'): Promise<string> => {
    // This function routes medical queries through the backend API for centralized rate limiting and to ensure safety templates are applied server-side
    try {
        const payload = { medical: { condition, audience } };
        const res = await callBackendGeneratePayload(payload);
        const text = res.text ?? (res.raw?.text ?? '');
        return text;
    } catch (error: any) {
        // Bubble up payment-required errors so UI can present a subscribe flow
        if (error?.status === 402) throw error;
        console.error('generateMedicalInfo error:', error);
        return handleError(error, 'generateMedicalInfo') as string;
    }
};

export const translateText = async (text: string, from: Language, to: Language): Promise<string> => {
    try {
        const prompt = `Translate the following text from ${from} to ${to}: "${text}"`;
        const res = await callBackendGenerate(prompt);
        return res.text;
    } catch (error) {
        return handleError(error, 'translateText');
    }
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / 1;
  const buffer = ctx.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

export const textToSpeech = async (text: string): Promise<void> => {
  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this with a clear, calm voice: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      // @ts-ignore
      const outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext);
      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAudioContext.destination);
      source.start();
    }
  } catch (error) {
    console.error("Error with Text-to-Speech:", error);
  }
};