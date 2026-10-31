interface CardProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  hoverable?: boolean;
  gradient?: boolean;
}

const Card: React.FC<CardProps> = ({
  title,
  description,
  icon,
  actions,
  children,
  hoverable = false,
  gradient = false,
}) => {
  return (
    <div
      className={`yyc3-card ${hoverable ? 'yyc3-card--hoverable' : ''} ${gradient ? 'yyc3-card--gradient' : ''}`}
    >
      {(title || icon) && (
        <div className="yyc3-card__header">
          {icon && <span className="yyc3-card__icon">{icon}</span>}
          {title && <h3 className="yyc3-card__title">{title}</h3>}
        </div>
      )}
      {description && <p className="yyc3-card__description">{description}</p>}
      {children && <div className="yyc3-card__content">{children}</div>}
      {actions && <div className="yyc3-card__actions">{actions}</div>}
    </div>
  );
};
