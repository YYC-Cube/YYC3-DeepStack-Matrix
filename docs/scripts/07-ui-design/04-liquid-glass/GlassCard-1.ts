import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  multi?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  gradient = false,
  multi = false,
}) => {
  const cardClass = `glass-card ${gradient ? 'glass-card-gradient' : ''} ${multi ? 'glass-card-multi' : ''} ${className}`;
  
  return (
    <div className={cardClass}>
      {children}
    </div>
  );
};
