interface WorkflowDesignerProps {
  mode: 'standalone' | 'widget';
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  onNodeSelect: (nodeId: string) => void;
  onNodeMove: (nodeId: string, position: { x: number; y: number }) => void;
  onConnectionAdd: (connection: WorkflowConnection) => void;
}

const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  mode,
  nodes,
  connections,
  onNodeSelect,
  onNodeMove,
  onConnectionAdd,
}) => {
  return (
    <div className={`yyc3-workflow-designer yyc3-workflow-designer--${mode}`}>
      <svg className="yyc3-workflow-designer__connections">
        {connections.map((connection) => (
          <ConnectionLine key={connection.id} connection={connection} />
        ))}
      </svg>
      <div className="yyc3-workflow-designer__nodes">
        {nodes.map((node) => (
          <WorkflowNode
            key={node.id}
            node={node}
            onSelect={() => onNodeSelect(node.id)}
            onMove={(position) => onNodeMove(node.id, position)}
          />
        ))}
      </div>
    </div>
  );
};
