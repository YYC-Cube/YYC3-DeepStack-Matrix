import React, { useState, useEffect } from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
}

export const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  className = '',
}) => {
  const [isGlitching, setIsGlitching] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(Math.random() > 0.7);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <span
      className={`glitch-text ${isGlitching ? 'glitching' : ''} ${className}`}
      data-text={text}
    >
      {text}
    </span>
  );
};
