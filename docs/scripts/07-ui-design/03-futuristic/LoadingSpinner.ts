const LoadingSpinner: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({
  size = 'medium',
}) => {
  return (
    <div className={`yyc3-loading-spinner yyc3-loading-spinner--${size}`}>
      <svg className="yyc3-loading-spinner__svg" viewBox="0 0 50 50">
        <circle
          className="yyc3-loading-spinner__circle"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="4"
        />
      </svg>
    </div>
  );
};
