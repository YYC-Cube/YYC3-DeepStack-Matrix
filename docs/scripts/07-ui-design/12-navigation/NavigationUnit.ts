import React, { useState } from 'react';

interface NavigationUnitProps {
  unit: NavigationUnit;
  onClick?: (unit: NavigationUnit) => void;
  onExpand?: (unit: NavigationUnit) => void;
}

const NavigationUnit: React.FC<NavigationUnitProps> = ({
  unit,
  onClick,
  onExpand,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    onClick?.(unit);
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExpand?.(unit);
  };

  return (
    <div
      className={`nav-unit ${unit.active ? 'active' : ''} ${isHovered ? 'hover' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {unit.icon && (
        <span className="nav-unit-icon">{unit.icon}</span>
      )}
      <span className="nav-unit-label">{unit.label}</span>
      {unit.badge && (
        <span className="nav-unit-badge">{unit.badge}</span>
      )}
      {unit.children && unit.children.length > 0 && (
        <span
          className={`nav-unit-arrow ${unit.expanded ? 'expanded' : ''}`}
          onClick={handleExpand}
        >
          ▼
        </span>
      )}
    </div>
  );
};

export default NavigationUnit;
