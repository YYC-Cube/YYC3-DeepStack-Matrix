const LazyCard = React.lazy(() => import('./Card'));

const CardGrid = ({ items }: { items: Item[] }) => {
  return (
    <div className="grid">
      {items.map((item) => (
        <React.Suspense key={item.id} fallback={<CardSkeleton />}>
          <LazyCard item={item} />
        </React.Suspense>
      ))}
    </div>
  );
};
