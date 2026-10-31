import { useState, useEffect } from 'react';

export const useContextAware = () => {
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const response = await fetch('/api/context');
        const data = await response.json();
        setContext(data);
      } catch (error) {
        console.error('Failed to fetch context:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContext();
  }, []);
  
  return { context, loading };
};
