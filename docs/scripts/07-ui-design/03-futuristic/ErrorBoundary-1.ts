interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  fallback,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      fallback || (
        <div className="yyc3-error-boundary">
          <div className="yyc3-error-boundary__icon">
            <ErrorIcon />
          </div>
          <h3 className="yyc3-error-boundary__title">出错了</h3>
          <p className="yyc3-error-boundary__message">
            页面加载失败，请刷新重试
          </p>
          <button
            className="yyc3-error-boundary__retry"
            onClick={() => window.location.reload()}
          >
            刷新页面
          </button>
        </div>
      )
    );
  }

  return <>{children}</>;
};
