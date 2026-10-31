import { useEffect, useState } from 'react';

export const useLightAnimation = () => {
  const [lights, setLights] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    delay: number;
    duration: number;
  }>>([]);

  useEffect(() => {
    // 生成随机光影
    const newLights = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 100 + Math.random() * 200,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 4,
    }));

    setLights(newLights);
  }, []);

  return lights;
};
