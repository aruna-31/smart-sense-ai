
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
type ChatMessage = {
  role: 'user' | 'model';
  text: string;
};

// Icons (replace with your own if needed)
const ChatIcon = () => <span>💬</span>;
const CloseIcon = () => <span>✖</span>;
const SendIcon = () => <span>➤</span>;

// ✅ BACKEND URL (MUST BE SET IN .env)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [subscribeInfo, setSubscribeInfo] = useState<null | { message?: string }>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Greeting and fetch history when opening
  useEffect(() => {
    const loadHistory = async (id: string) => {
      try {
        const r = await fetch('/api/chat/history', { headers: { 'x-user-id': id } });
        if (!r.ok) return;
        const data = await r.json();
        if (Array.isArray(data) && data.length) {
          setMessages(data.map((m: any) => ({ role: m.role, text: m.text })));
          return;
        }
        setMessages([{ role: 'model', text: 'Hello 👋 How can I help you today?' }]);
      } catch (err) {
        setMessages([{ role: 'model', text: 'Hello 👋 How can I help you today?' }]);
      }
    };

    if (isOpen) {
      const id = localStorage.getItem('user-id');
      if (id) loadHistory(id);
      else setMessages([{ role: 'model', text: 'Hello 👋 How can I help you today?' }]);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Generate / persist user id (for rate limiting)
    let userId = localStorage.getItem('user-id');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('user-id', userId);
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ prompt: userMessage.text }),
      });

      if (res.status === 402) {
        const body = await res.json().catch(() => null);
        const payload = body?.detail ?? body ?? null;
        // show a small system message and attach subscribe info
        const msg: ChatMessage = {
          role: 'model',
          text: (payload && payload.message) || 'Free quota exhausted. Subscribe to continue.',
        };
        setMessages((prev) => [...prev, msg]);
        // store subscribe details for UI (subscribe_url, amount)
        setSubscribeInfo(payload ?? { message: 'Subscription required', subscribe_url: null });
        return;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Backend error ${res.status}: ${errText}`);
      }

      const contentType = res.headers.get('Content-Type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(
          'Backend returned an unexpected response (not JSON). ' +
          'Please check that VITE_BACKEND_URL is correctly set in your Render environment variables.'
        );
      }

      const data = await res.json();

      const modelMessage: ChatMessage = {
        role: 'model',
        text: data.text || 'No response received.',
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);

      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text:
            error instanceof Error
              ? error.message
              : 'Something went wrong. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-purple-600 text-white shadow-xl z-50"
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 right-6 w-[90vw] sm:w-96 h-[60vh] bg-gray-900 rounded-xl shadow-2xl flex flex-col z-40"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-700 text-white font-semibold">
              Smart Sense AI
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="text-gray-400 text-sm">AI is typing…</div>
              )}

              <div ref={messagesEndRef} />

              {subscribeInfo && (
                <div className="p-3">
                  <div className="bg-yellow-900/80 border border-yellow-700 p-3 rounded-lg text-yellow-100 text-sm flex justify-between items-center">
                    <div>{subscribeInfo.message ?? 'You have reached the request limit.'}</div>
                    <button className="px-3 py-1 bg-gray-700 rounded" onClick={() => setSubscribeInfo(null)}>Dismiss</button>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-700 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg outline-none"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="bg-purple-600 px-4 rounded-lg text-white disabled:opacity-50"
              >
                <SendIcon />
              </button>
            </div>

          </motion.div>

        )}
      </AnimatePresence>

    </>
  );
};
