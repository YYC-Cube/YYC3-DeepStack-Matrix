interface ToolCardProps {
  tool: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
  };
  onClick?: (toolId: string) => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, onClick }) => {
  return (
    <div
      className="yyc3-tool-card"
      onClick={() => onClick?.(tool.id)}
    >
      <div className="yyc3-tool-card__icon">
        <img src={tool.icon} alt={tool.name} />
      </div>
      <div className="yyc3-tool-card__content">
        <h4 className="yyc3-tool-card__name">{tool.name}</h4>
        <p className="yyc3-tool-card__description">{tool.description}</p>
        <span className="yyc3-tool-card__category">{tool.category}</span>
      </div>
    </div>
  );
};
