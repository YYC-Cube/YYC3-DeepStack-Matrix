import React from 'react';

interface NeonCardProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
}

export const NeonCard: React.FC<NeonCardProps> = ({
  children,
  className = '',
  color = '#00f0ff',
}) => {
  return (
    <div
      className="card-neon"
      style={{
        '--neon-color': color,
        borderColor: color,
        boxShadow: `0 0 10px ${color}, 0 0 20px ${color}4d`,
      }}
    >
      {children}
    </div>
  );
};
