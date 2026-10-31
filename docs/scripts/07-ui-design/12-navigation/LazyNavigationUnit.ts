const LazyNavigationUnit = React.lazy(() => import('./NavigationUnit'));

const NavigationList = ({ items }: { items: NavigationUnit[] }) => {
  return (
    <div>
      {items.map((item) => (
        <React.Suspense key={item.id} fallback={<NavSkeleton />}>
          <LazyNavigationUnit unit={item} />
        </React.Suspense>
      ))}
    </div>
  );
};
