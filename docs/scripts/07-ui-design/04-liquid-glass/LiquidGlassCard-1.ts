import React from 'react';
import { motion } from 'motion/react';

interface LiquidGlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function LiquidGlassCard({ children, className, hover = true }: LiquidGlassCardProps) {
  return (
    <motion.div
      className={`liquid-glass ${className || ''}`}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }}
      whileHover={hover ? {
        y: -8,
        scale: 1.02,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
      } : undefined}
    >
      {children}
    </motion.div>
  );
}
