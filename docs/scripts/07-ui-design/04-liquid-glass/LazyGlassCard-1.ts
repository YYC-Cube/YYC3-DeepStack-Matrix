const LazyGlassCard = React.lazy(() => import('./components/GlassCard'));

const App = () => {
  return (
    <React.Suspense fallback={<Loading />}>
      <LazyGlassCard />
    </React.Suspense>
  );
};
