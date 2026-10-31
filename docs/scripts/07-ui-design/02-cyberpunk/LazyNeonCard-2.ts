const LazyNeonCard = React.lazy(() => import('./components/cyberpunk/NeonCard'));

const App = () => {
  return (
    <React.Suspense fallback={<Loading />}>
      <LazyNeonCard />
    </React.Suspense>
  );
};
