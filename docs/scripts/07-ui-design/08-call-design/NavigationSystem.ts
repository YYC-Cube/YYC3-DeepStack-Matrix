import React, { useState } from 'react';

interface NavigationUnit {
  id: string;
  type: 'main' | 'sub' | 'tab';
  label: string;
  icon?: string;
  badge?: number;
  path?: string;
  external?: boolean;
  children?: NavigationUnit[];
  active: boolean;
  expanded: boolean;
  disabled: boolean;
  permission?: string[];
  config?: {
    closable?: boolean;
    draggable?: boolean;
    pinned?: boolean;
    maxTabs?: number;
  };
}

export const NavigationSystem: React.FC = () => {
  const [mainNav, setMainNav] = useState<NavigationUnit[]>([]);
  const [subNav, setSubNav] = useState<NavigationUnit[]>([]);
  const [tabs, setTabs] = useState<NavigationUnit[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');

  return (
    <div className="navigation-system">
      <MainNavigation items={mainNav} />
      <SubNavigation items={subNav} />
      <TabNavigation items={tabs} activeTab={activeTab} />
    </div>
  );
};
