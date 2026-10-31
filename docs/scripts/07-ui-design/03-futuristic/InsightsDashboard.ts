interface InsightsDashboardProps {
  mode: 'standalone' | 'widget';
  metrics: DashboardMetrics[];
  charts: ChartData[];
}

const InsightsDashboard: React.FC<InsightsDashboardProps> = ({
  mode,
  metrics,
  charts,
}) => {
  return (
    <div className={`yyc3-insights-dashboard yyc3-insights-dashboard--${mode}`}>
      <div className="yyc3-insights-dashboard__metrics">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
      <div className="yyc3-insights-dashboard__charts">
        {charts.map((chart) => (
          <ChartCard key={chart.id} chart={chart} />
        ))}
      </div>
    </div>
  );
};
