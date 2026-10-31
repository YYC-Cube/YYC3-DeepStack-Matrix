// ✅ 正确：响应式布局
const ResponsiveLayout = ({ children }) => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
};
