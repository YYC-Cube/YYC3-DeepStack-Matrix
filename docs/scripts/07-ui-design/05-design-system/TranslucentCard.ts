import React from 'react';

interface TranslucentCardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

export const TranslucentCard: React.FC<TranslucentCardProps> = ({
  children,
  className = '',
  gradient = false,
}) => {
  return (
    <div
      className={`card-translucent ${gradient ? 'card-gradient' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
