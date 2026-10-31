import React, { useState } from 'react';

interface TabProps {
  tab: ClosableTab;
  isActive: boolean;
  onClose: (tabId: string) => void;
  onClick: (tabId: string) => void;
}

const Tab: React.FC<TabProps> = ({
  tab,
  isActive,
  onClose,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(tab.id);
  };

  return (
    <div
      className={`tab-item ${isActive ? 'active' : ''}`}
      onClick={() => onClick(tab.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('tabId', tab.id)}
    >
      {tab.icon && (
        <span className="tab-icon">{tab.icon}</span>
      )}
      <span className="tab-text">{tab.label}</span>
      {tab.closable && !tab.pinned && (isHovered || isActive) && (
        <span className="tab-close" onClick={handleClose}>
          ✕
        </span>
      )}
      {tab.badge && (
        <span className="tab-badge">{tab.badge}</span>
      )}
    </div>
  );
};

export default Tab;
