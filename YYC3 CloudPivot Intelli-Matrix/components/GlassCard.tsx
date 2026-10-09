import React, { forwardRef } from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(({ children, className = "", glowColor, onClick, style, ...rest }, ref) => {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`
        relative rounded-xl
        bg-card backdrop-blur-xl
        border border-border
        shadow-glow-md
        transition-all duration-300
        hover:border-primary/30
        hover:shadow-glow-lg
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
      style={glowColor ? { boxShadow: `0 0 30px ${glowColor}`, ...style } : style}
      {...rest}
    >
      {children}
    </div>
  );
});

GlassCard.displayName = "GlassCard";