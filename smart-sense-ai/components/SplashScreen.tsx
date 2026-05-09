import React from 'react';
// FIX: Import Variants type from framer-motion to correctly type animation variants.
import { motion, Variants } from 'framer-motion';

// FIX: Explicitly type containerVariants with the Variants type for consistency and type safety.
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.3,
    },
  },
};

// FIX: Explicitly type letterVariants with the Variants type to resolve a TypeScript error where the transition type 'spring' was being inferred as a generic string.
const letterVariants: Variants = {
  hidden: { y: 50, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 12,
    },
  },
};

export const SplashScreen: React.FC = () => {
  const title = "SmartSense AI";
  const letters = Array.from(title);

  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      className="fixed inset-0 flex items-center justify-center bg-gray-900 z-[100]"
    >
      <motion.h1
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center text-4xl md:text-6xl font-bold font-poppins text-white"
        aria-label={title}
      >
        {letters.map((char, index) => (
          <motion.span
            key={index}
            variants={letterVariants}
            className={index >= 10 ? 'bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-pink' : 'text-white'}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </motion.h1>
    </motion.div>
  );
};
