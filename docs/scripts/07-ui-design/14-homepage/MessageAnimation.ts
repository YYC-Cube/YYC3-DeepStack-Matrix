// src/components/homepage/MessageAnimation.tsx
import React from 'react';

interface MessageAnimationProps {
  children: React.ReactNode;
  isUser: boolean;
}

export const MessageAnimation: React.FC<MessageAnimationProps> = ({
  children,
  isUser,
}) => {
  return (
    <div className={`message-animation ${isUser ? 'message-animation--user' : 'message-animation--ai'}`}>
      {children}
    </div>
  );
};
