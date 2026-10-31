import { useEffect, useState } from 'react';

export const useLiquidAnimation = () => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    delay: number;
    duration: number;
  }>>([]);
  
  useEffect(() => {
    // 生成随机粒子
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 10,
    }));
    
    setParticles(newParticles);
  }, []);
  
  return particles;
};
