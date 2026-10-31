const LazyTranslucentCard = React.lazy(() => import('./components/aurora/TranslucentCard'));

const App = () => {
  return (
    <React.Suspense fallback={<Loading />}>
      <LazyTranslucentCard />
    </React.Suspense>
  );
};
