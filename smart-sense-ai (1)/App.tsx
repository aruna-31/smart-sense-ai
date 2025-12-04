
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { SmartExcuseGenerator } from './components/ExcuseGenerator';
import { LearningHub } from './components/LearningHub';
import { MedicalGenerator } from './components/MedicalGenerator';
import { VoiceTranslator } from './components/VoiceTranslator';
import { Chatbot } from './components/Chatbot';
import { Auth } from './components/Auth';
import { SplashScreen } from './components/SplashScreen';

export type Page = 'smart-excuse-generator' | 'learning-hub' | 'medical-generator' | 'voice-translator';

const App: React.FC = () => {
  const [isShowingSplash, setIsShowingSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState<Page>('smart-excuse-generator');
  
  useEffect(() => {
    const timer = setTimeout(() => setIsShowingSplash(false), 3000); // Splash screen for 3 seconds
    return () => clearTimeout(timer);
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'smart-excuse-generator':
        return <SmartExcuseGenerator key="smart-excuse-generator" />;
      case 'learning-hub':
        return <LearningHub key="learning-hub" />;
      case 'medical-generator':
        return <MedicalGenerator key="medical-generator" />;
      case 'voice-translator':
        return <VoiceTranslator key="voice-translator" />;
      default:
        return <SmartExcuseGenerator key="smart-excuse-generator" />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isShowingSplash ? (
        <SplashScreen key="splash" />
      ) : !isAuthenticated ? (
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <Auth onLogin={() => setIsAuthenticated(true)} />
        </motion.div>
      ) : (
        <motion.div key="main-app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black">
            <Sidebar activePage={activePage} setActivePage={setActivePage} onLogout={() => setIsAuthenticated(false)} />
            <main className="flex-1 p-4 sm:p-6 md:p-10 transition-all duration-300 ml-16 md:ml-64">
              <AnimatePresence mode="wait">
                {renderPage()}
              </AnimatePresence>
            </main>
            <Chatbot />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default App;
