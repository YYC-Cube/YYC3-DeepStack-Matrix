import React, { useEffect, useRef } from 'react';

interface LightEffectProps {
  children: React.ReactNode;
  className?: string;
}

export const LightEffect: React.FC<LightEffectProps> = ({
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 创建光影移动效果
    const createLightEffect = () => {
      const light = document.createElement('div');
      light.className = 'light-move';
      container.appendChild(light);
    };

    createLightEffect();

    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <div ref={containerRef} className={`light-penetrate ${className}`}>
      {children}
    </div>
  );
};
