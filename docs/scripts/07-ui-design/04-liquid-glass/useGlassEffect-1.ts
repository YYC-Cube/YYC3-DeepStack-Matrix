import { useEffect, useRef } from 'react';

export const useGlassEffect = (enabled: boolean = true) => {
  const elementRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (!enabled || !elementRef.current) return;
    
    const element = elementRef.current;
    
    // 添加鼠标移动的光泽效果
    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      element.style.setProperty('--mouse-x', `${x}px`);
      element.style.setProperty('--mouse-y', `${y}px`);
    };
    
    element.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled]);
  
  return elementRef;
};
