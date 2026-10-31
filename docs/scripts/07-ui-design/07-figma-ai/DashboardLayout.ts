/**
 * @file DashboardLayout.tsx
 * @description 仪表板布局模板
 * @version v1.0.0
 */

import React from 'react';

interface DashboardLayoutProps {
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  sidebar,
  header,
  children
}) => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      {sidebar && (
        <aside className="w-64 bg-white shadow-lg hidden md:block">
          {sidebar}
        </aside>
      )}
      
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航 */}
        {header && (
          <header className="h-16 bg-white shadow-sm">
            {header}
          </header>
        )}
        
        {/* 内容区域 */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
