const LazyMinimalCard = React.lazy(() => import('./components/future-tech/MinimalCard'));

const App = () => {
  return (
    <React.Suspense fallback={<Loading />}>
      <LazyMinimalCard />
    </React.Suspense>
  );
};
