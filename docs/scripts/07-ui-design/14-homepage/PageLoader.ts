// src/components/homepage/PageLoader.tsx
import React, { useEffect, useState } from 'react';

export const PageLoader: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (!isLoading) return null;

  return (
    <div className="page-loader">
      <div className="page-loader__logo">
        <div className="page-loader__logo-ring page-loader__logo-ring--1" />
        <div className="page-loader__logo-ring page-loader__logo-ring--2" />
        <div className="page-loader__logo-ring page-loader__logo-ring--3" />
      </div>
      <div className="page-loader__text">
        <span>Y</span>
        <span>Y</span>
        <span>C</span>
        <span>³</span>
      </div>
    </div>
  );
};
