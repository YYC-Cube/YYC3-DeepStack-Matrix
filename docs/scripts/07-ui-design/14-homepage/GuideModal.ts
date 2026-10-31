// src/components/homepage/GuideModal.tsx
import React, { useState, useEffect } from 'react';
import { intentRecognitionEngine } from '@/services/intentRecognition';

interface GuideModalProps {
  userMessage: string;
  conversationHistory: Message[];
  onConfirm: (targetModule: string) => void;
  onDismiss: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({
  userMessage,
  conversationHistory,
  onConfirm,
  onDismiss,
}) => {
  const [intent, setIntent] = useState<IntentRecognitionResult | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 延迟显示，避免干扰用户输入
    const timer = setTimeout(() => {
      const recognition = intentRecognitionEngine.recognize(userMessage, conversationHistory);
      
      if (recognition.confidence >= 0.5 && recognition.targetModule !== 'continue-chat') {
        setIntent(recognition);
        setIsVisible(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [userMessage, conversationHistory]);

  if (!isVisible || !intent) return null;

  return (
    <div className="guide-modal">
      <div className="guide-modal__backdrop" onClick={onDismiss} />
      <div className="guide-modal__content">
        <div className="guide-modal__header">
          <div className="guide-modal__icon">🤖</div>
          <h3 className="guide-modal__title">AI 智能建议</h3>
        </div>
        
        <div className="guide-modal__body">
          <p className="guide-modal__suggestion">{intent.suggestedAction}</p>
          
          {intent.detectedKeywords.length > 0 && (
            <div className="guide-modal__keywords">
              <span className="guide-modal__keywords-label">检测到关键词：</span>
              {intent.detectedKeywords.map((keyword, index) => (
                <span key={index} className="guide-modal__keyword">
                  {keyword}
                </span>
              ))}
            </div>
          )}
          
          <div className="guide-modal__confidence">
            <span className="guide-modal__confidence-label">置信度：</span>
            <div className="guide-modal__confidence-bar">
              <div 
                className="guide-modal__confidence-fill"
                style={{ width: `${intent.confidence * 100}%` }}
              />
            </div>
            <span className="guide-modal__confidence-value">
              {Math.round(intent.confidence * 100)}%
            </span>
          </div>
        </div>
        
        <div className="guide-modal__footer">
          <button 
            className="guide-modal__button guide-modal__button--secondary"
            onClick={onDismiss}
          >
            继续对话
          </button>
          <button 
            className="guide-modal__button guide-modal__button--primary"
            onClick={() => onConfirm(intent.targetModule)}
          >
            {intent.suggestedAction}
          </button>
        </div>
      </div>
    </div>
  );
};
