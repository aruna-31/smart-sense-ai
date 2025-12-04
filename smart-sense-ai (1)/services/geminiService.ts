
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ExcuseMode, ApologyTone, EmailTone, LetterTone, Language } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// FIX: Overload handleError to specify return types for different contexts, resolving type errors.
function handleError(error: any, context: 'generateExcuse' | 'generateApology'): {text: string; percentage: number; emoji: string;};
function handleError(error: any, context: string): string;
function handleError(error: any, context: string): string | { text: string; percentage: number; emoji: string; } {
  console.error(`Error in ${context}:`, error);
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
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: resultSchema,
        },
    });
    return JSON.parse(response.text);
  } catch (error) {
    return handleError(error, 'generateExcuse');
  }
};

export const generateApology = async (situation: string, tone: ApologyTone): Promise<{text: string; percentage: number; emoji: string;}> => {
  try {
    const prompt = `Generate a ${tone.toLowerCase()} apology for: "${situation}". Make it heartfelt. Also provide a sincerity percentage and a fitting emoji.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: resultSchema,
        },
    });
    return JSON.parse(response.text);
  } catch (error) {
    return handleError(error, 'generateApology');
  }
};

export const generateEmail = async (to: string, subject: string, points: string, tone: EmailTone): Promise<string> => {
    try {
        const prompt = `Compose a ${tone.toLowerCase()} email body with these details:\n- To: ${to}\n- Subject: ${subject}\n- Points: ${points}\nGenerate only the email body.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (error) {
        return handleError(error, 'generateEmail');
    }
};

export const generateLetter = async (to: string, from: string, points: string, tone: LetterTone): Promise<string> => {
    try {
        const prompt = `Compose a ${tone.toLowerCase()} letter body with these details:\n- To: ${to}\n- From: ${from}\n- Points: ${points}\nGenerate only the letter body.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (error) {
        return handleError(error, 'generateLetter');
    }
};

// FIX: Added missing summarizeText function used in ProductivitySuite component.
export type SummaryLength = 'Short' | 'Medium' | 'Detailed';

export const summarizeText = async (text: string, length: SummaryLength): Promise<string> => {
    try {
        const prompt = `Summarize the following text in a ${length.toLowerCase()} format:\n\n"${text}"`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (error) {
        return handleError(error, 'summarizeText');
    }
};

export const generateLearningRoadmap = async (topic: string): Promise<string> => {
    try {
        const prompt = `Generate a structured, beginner-friendly learning roadmap for "${topic}". Include clear steps, key concepts, and suggest real, hyperlinked online resources (articles, videos, interactive tutorials, projects) for each step. Format as Markdown.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
        return response.text;
    } catch (error) {
        return handleError(error, 'generateLearningRoadmap');
    }
};

export const generateMedicalInfo = async (condition: string, audience: 'Patient' | 'Student'): Promise<string> => {
    try {
        const prompt = audience === 'Student'
            ? `For educational purposes, generate a fake but believable medical proof/doctor's note for a student needing a leave of absence for "${condition}". Include a fictional doctor's name and clinic. This is not real medical advice.`
            : `For educational purposes, generate a simplified description of "${condition}" for a "Patient". Cover what it is, common symptoms, and general treatment approaches in simple terms. This is not medical advice.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    } catch (error) {
        return handleError(error, 'generateMedicalInfo');
    }
};

export const translateText = async (text: string, from: Language, to: Language): Promise<string> => {
    try {
        const prompt = `Translate the following text from ${from} to ${to}: "${text}"`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
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