import { useEffect, useState } from 'react';

export const useGlitchAnimation = (enabled: boolean = true) => {
  const [isGlitching, setIsGlitching] = useState(false);
  
  useEffect(() => {
    if (!enabled) return;
    
    const interval = setInterval(() => {
      setIsGlitching(Math.random() > 0.8);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [enabled]);
  
  return isGlitching;
};
