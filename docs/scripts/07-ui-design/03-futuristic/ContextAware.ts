import React, { useState, useEffect } from 'react';

interface ContextAwareProps {
  children: React.ReactNode;
  priority?: 'high' | 'medium' | 'low';
}

export const ContextAware: React.FC<ContextAwareProps> = ({
  children,
  priority = 'medium',
}) => {
  const [context, setContext] = useState<any>(null);
  
  useEffect(() => {
    // 获取上下文信息
    const fetchContext = async () => {
      const response = await fetch('/api/context');
      const data = await response.json();
      setContext(data);
    };
    
    fetchContext();
  }, []);
  
  return (
    <div
      className="context-aware"
      data-priority={priority}
      data-context={context?.type}
    >
      {children}
    </div>
  );
};
