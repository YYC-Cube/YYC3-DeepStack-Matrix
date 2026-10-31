import { useEffect, useRef } from 'react';

export const useSmartAnimation = (enabled: boolean = true) => {
  const elementRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (!enabled || !elementRef.current) return;
    
    const element = elementRef.current;
    
    // 添加智能动画效果
    const addSmartAnimation = () => {
      element.style.animation = 'smartExpand 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    };
    
    addSmartAnimation();
    
    return () => {
      element.style.animation = '';
    };
  }, [enabled]);
  
  return elementRef;
};
