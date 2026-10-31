import React from 'react';

interface MinimalCardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export const MinimalCard: React.FC<MinimalCardProps> = ({
  children,
  className = '',
  gradient = false,
  priority = 'medium',
}) => {
  return (
    <div
      className={`card-minimal ${gradient ? 'card-gradient' : ''} ${className}`}
      data-priority={priority}
    >
      {children}
    </div>
  );
};
