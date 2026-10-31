import React from 'react';
import { motion } from 'motion/react';

interface LiquidGlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function LiquidGlassButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false
}: LiquidGlassButtonProps) {
  return (
    <motion.button
      className={`btn-liquid btn-liquid-${variant} btn-liquid-${size}`}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.button>
  );
}
