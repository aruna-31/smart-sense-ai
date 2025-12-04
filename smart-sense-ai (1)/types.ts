
export type ExcuseMode = 'Believable' | 'Funny' | 'Urgent' | 'Professional';
export type ApologyTone = 'Sincere' | 'Formal' | 'Casual';
export type EmailTone = 'Formal' | 'Casual' | 'Friendly' | 'Urgent';
export type LetterTone = 'Formal' | 'Informal' | 'Friendly';
export type WriterTool = 'excuse' | 'apology' | 'email' | 'letter';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type Language = 'English' | 'Hindi' | 'Telugu' | 'Urdu' | 'Tamil' | 'Kannada' | 'Spanish' | 'French' | 'German' | 'Japanese' | 'Russian';

export const languageCodeMap: Record<Language, string> = {
    'English': 'en-US',
    'Hindi': 'hi-IN',
    'Telugu': 'te-IN',
    'Urdu': 'ur-PK',
    'Tamil': 'ta-IN',
    'Kannada': 'kn-IN',
    'Spanish': 'es-ES',
    'French': 'fr-FR',
    'German': 'de-DE',
    'Japanese': 'ja-JP',
    'Russian': 'ru-RU',
};
