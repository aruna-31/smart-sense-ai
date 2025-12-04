
import React from 'react';
import { motion } from 'framer-motion';
import { Page } from '../App';
import { StudyIcon, WriterIcon, MedicalIcon, TranslateIcon, LogoutIcon } from './icons';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  onLogout: () => void;
}

const navItems = [
  { id: 'smart-excuse-generator', name: 'SMART Excuse Gen', icon: <WriterIcon /> },
  { id: 'learning-hub', name: 'Learning Hub', icon: <StudyIcon /> },
  { id: 'medical-generator', name: 'Medical Generator', icon: <MedicalIcon /> },
  { id: 'voice-translator', name: 'Voice Translator', icon: <TranslateIcon /> },
];

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, onLogout }) => {
  return (
    <motion.aside
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed top-0 left-0 h-full bg-gray-900/50 backdrop-blur-lg border-r border-gray-700/50 w-16 md:w-64 z-50 flex flex-col"
    >
      <div className="flex items-center justify-center md:justify-start h-20 px-4 md:px-6 border-b border-gray-700/50">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-purple to-brand-pink"></div>
        <h1 className="hidden md:block ml-3 text-xl font-bold font-poppins bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-pink">
          SmartSense AI
        </h1>
      </div>
      <nav className="flex-1 mt-6">
        <ul>
          {navItems.map((item) => (
            <li key={item.id} className="px-3 md:px-4 my-2">
              <button
                onClick={() => setActivePage(item.id as Page)}
                className={`w-full flex items-center justify-center md:justify-start p-3 rounded-lg transition-all duration-200 relative ${
                  activePage === item.id
                    ? 'bg-brand-purple/20 text-white'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <div className="w-6 h-6">{item.icon}</div>
                <span className="hidden md:inline-block ml-4 font-semibold">{item.name}</span>
                {activePage === item.id && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute left-0 h-8 w-1 bg-brand-pink rounded-r-full"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="px-3 md:px-4 py-4 border-t border-gray-700/50">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center md:justify-start p-3 rounded-lg text-gray-400 hover:bg-red-500/20 hover:text-white transition-all duration-200"
        >
          <div className="w-6 h-6"><LogoutIcon /></div>
          <span className="hidden md:inline-block ml-4 font-semibold">Logout</span>
        </button>
      </div>
    </motion.aside>
  );
};
