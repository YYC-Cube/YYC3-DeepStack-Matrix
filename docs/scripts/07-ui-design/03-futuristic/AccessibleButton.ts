// ARIA属性示例
const AccessibleButton = ({ children, ...props }: ButtonProps) => {
  return (
    <button
      {...props}
      role="button"
      aria-label={props['aria-label']}
      aria-pressed={props['aria-pressed']}
      aria-expanded={props['aria-expanded']}
      aria-disabled={props.disabled}
    >
      {children}
    </button>
  );
};
