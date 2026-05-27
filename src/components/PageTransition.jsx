import React from 'react';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
    scale: 0.99,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.22, 1, 0.36, 1], // Snappy Apple-like ease out
      staggerChildren: 0.03
    }
  },
  exit: {
    opacity: 0,
    scale: 0.99,
    transition: {
      duration: 0.1, // Very fast exit so it doesn't stay empty
      ease: [0.32, 0, 0.67, 0] // ease-in for exit
    }
  }
};

const PageTransition = ({ children, className = '' }) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`w-full h-full ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
