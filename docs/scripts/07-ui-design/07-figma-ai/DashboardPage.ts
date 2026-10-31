/**
 * @file DashboardPage.tsx
 * @description 仪表板页面
 * @version v1.0.0
 */

import React from 'react';
import DashboardLayout from '../templates/DashboardLayout';
import Sidebar from '../organisms/Sidebar';
import Header from '../organisms/Header';
import StatCard from '../molecules/StatCard';
import Chart from '../organisms/Chart';
import RecentActivity from '../organisms/RecentActivity';

const DashboardPage: React.FC = () => {
  return (
    <DashboardLayout
      sidebar={<Sidebar />}
      header={<Header />}
    >
      <div className="space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="总用户数"
            value="1,234"
            change="+12%"
            trend="up"
          />
          <StatCard
            title="活跃用户"
            value="856"
            change="+8%"
            trend="up"
          />
          <StatCard
            title="新注册"
            value="123"
            change="+5%"
            trend="up"
          />
          <StatCard
            title="转化率"
            value="3.2%"
            change="-2%"
            trend="down"
          />
        </div>
        
        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Chart title="用户增长趋势" />
          <Chart title="活跃度分析" />
        </div>
        
        {/* 最近活动 */}
        <RecentActivity />
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
