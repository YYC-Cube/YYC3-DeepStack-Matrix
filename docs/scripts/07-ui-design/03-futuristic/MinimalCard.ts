import React from 'react';

interface MinimalCardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

export const MinimalCard: React.FC<MinimalCardProps> = ({
  children,
  className = '',
  gradient = false,
}) => {
  return (
    <div
      className={`card-minimal ${gradient ? 'card-gradient' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
