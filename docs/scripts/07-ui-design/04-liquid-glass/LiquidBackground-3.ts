import React from 'react';

interface LiquidBackgroundProps {
  children: React.ReactNode;
  particles?: boolean;
  glows?: boolean;
}

export function LiquidBackground({ children, particles = true, glows = true }: LiquidBackgroundProps) {
  return (
    <div className="liquid-background">
      {glows && (
        <>
          <div className="liquid-glow glow-1" />
          <div className="liquid-glow glow-2" />
          <div className="liquid-glow glow-3" />
        </>
      )}
      {particles && (
        <>
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={`particle particle-${['sm', 'md', 'lg'][i % 3]}`}
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
              }}
            />
          ))}
        </>
      )}
      {children}
    </div>
  );
}
