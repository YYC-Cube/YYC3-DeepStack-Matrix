// 模块懒加载
const LazyWorkflowDesigner = React.lazy(() =>
  import('./modules/WorkflowDesigner')
);

const LazyInsightsDashboard = React.lazy(() =>
  import('./modules/InsightsDashboard')
);

// 使用懒加载组件
const App = () => {
  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <LazyWorkflowDesigner />
      <LazyInsightsDashboard />
    </React.Suspense>
  );
};
