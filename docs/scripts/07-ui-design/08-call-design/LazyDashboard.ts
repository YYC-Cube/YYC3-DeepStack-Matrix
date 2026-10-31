const LazyDashboard = React.lazy(() => import('./pages/Dashboard'));
const LazyCustomerManagement = React.lazy(() => import('./pages/CustomerManagement'));
const LazyAnalytics = React.lazy(() => import('./pages/Analytics'));

const App = () => {
  return (
    <React.Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<LazyDashboard />} />
        <Route path="/customers" element={<LazyCustomerManagement />} />
        <Route path="/analytics" element={<LazyAnalytics />} />
      </Routes>
    </React.Suspense>
  );
};
