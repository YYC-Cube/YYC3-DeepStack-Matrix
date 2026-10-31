interface InputProps {
  type?: 'text' | 'password' | 'email' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
  multiline?: boolean;
}

const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error,
  icon,
  multiline = false,
}) => {
  const Component = multiline ? 'textarea' : 'input';

  return (
    <div className={`yyc3-input ${error ? 'yyc3-input--error' : ''}`}>
      {icon && <span className="yyc3-input__icon">{icon}</span>}
      <Component
        type={type}
        className="yyc3-input__field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
      />
      {error && <span className="yyc3-input__error">{error}</span>}
    </div>
  );
};
