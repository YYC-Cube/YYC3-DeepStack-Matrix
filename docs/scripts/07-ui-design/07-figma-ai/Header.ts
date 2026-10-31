/**
 * @file Header.tsx
 * @description 页头导航组件
 * @version v1.0.0
 */

import React from 'react';
import Logo from './atoms/Logo';
import Navigation from './organisms/Navigation';
import UserMenu from './organisms/UserMenu';

interface HeaderProps {
  logo?: string;
  navigationItems?: NavigationItem[];
  user?: User;
}

const Header: React.FC<HeaderProps> = ({
  logo = '/logo.svg',
  navigationItems = [],
  user
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white shadow-md">
      <Logo src={logo} alt="Logo" />
      <Navigation items={navigationItems} />
      <UserMenu user={user} />
    </header>
  );
};

export default Header;
