import { useEffect, useRef } from 'react';

export const useNeonEffect = (color: string = '#00f0ff') => {
  const elementRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (!elementRef.current) return;
    
    const element = elementRef.current;
    
    // 添加脉冲发光效果
    const addPulseEffect = () => {
      element.style.setProperty('--neon-glow', color);
    };
    
    addPulseEffect();
    
    return () => {
      element.style.removeProperty('--neon-glow');
    };
  }, [color]);
  
  return elementRef;
};
