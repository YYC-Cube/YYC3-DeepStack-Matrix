import React, { useEffect, useRef } from 'react';

export const LiquidBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // 创建浮动粒子
    const createParticles = () => {
      for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'glass-particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 20}s`;
        particle.style.animationDuration = `${15 + Math.random() * 10}s`;
        container.appendChild(particle);
      }
    };
    
    createParticles();
    
    return () => {
      container.innerHTML = '';
    };
  }, []);
  
  return (
    <div ref={containerRef} className="liquid-background">
      {/* 粒子将通过JS动态添加 */}
    </div>
  );
};
