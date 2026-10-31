// ✅ 正确：内容占位
const ArticleTemplate = () => {
  return (
    <article className="max-w-3xl mx-auto">
      <header className="mb-8">
        <div className="h-8 bg-gray-200 rounded mb-4" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </header>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded" />
        ))}
      </div>
    </article>
  );
};
