// ✅ 正确：性能优化
const ListPage = () => {
  const { data, loading, error } = useFetchItems();
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return (
    <div>
      <h1>列表页</h1>
      <List items={data} />
      <Pagination />
    </div>
  );
};
