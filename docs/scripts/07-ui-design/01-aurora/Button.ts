interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'link';
  size: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  children,
  onClick,
}) => {
  return (
    <button
      className={`yyc3-button yyc3-button--${variant} yyc3-button--${size}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <LoadingSpinner />}
      {icon && !loading && <span className="yyc3-button__icon">{icon}</span>}
      <span className="yyc3-button__content">{children}</span>
    </button>
  );
};
