import { useEffect, useRef } from 'react';

export const useAuroraEffect = (enabled: boolean = true) => {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const element = elementRef.current;

    // 添加极光渐变效果
    const addAuroraEffect = () => {
      element.style.background = 'linear-gradient(135deg, #00ff87 0%, #60efff 50%, #ff6b6b 100%)';
      element.style.backgroundSize = '200% 200%';
      element.style.animation = 'aurora-flow 15s ease infinite';
    };

    addAuroraEffect();

    return () => {
      element.style.background = '';
      element.style.backgroundSize = '';
      element.style.animation = '';
    };
  }, [enabled]);

  return elementRef;
};
