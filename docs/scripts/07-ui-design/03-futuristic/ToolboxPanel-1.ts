interface ToolboxPanelProps {
  mode: 'standalone' | 'widget';
  tools: Tool[];
  onToolSelect: (toolId: string) => void;
  selectedToolId?: string;
}

const ToolboxPanel: React.FC<ToolboxPanelProps> = ({
  mode,
  tools,
  onToolSelect,
  selectedToolId,
}) => {
  return (
    <div className={`yyc3-toolbox-panel yyc3-toolbox-panel--${mode}`}>
      <div className="yyc3-toolbox-panel__tools">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            selected={tool.id === selectedToolId}
            onClick={() => onToolSelect(tool.id)}
          />
        ))}
      </div>
    </div>
  );
};
