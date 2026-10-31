const LazyGlassCard = React.lazy(() => import('./components/glass/GlassCard'));

const App = () => {
  return (
    <React.Suspense fallback={<Loading />}>
      <LazyGlassCard />
    </React.Suspense>
  );
};
