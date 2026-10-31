interface ExecutionModule {
  executeTask(task: Task): Promise<ExecutionResult>;
  invokeTool(tool: Tool, params: any): Promise<ToolResult>;
  executeWorkflow(workflow: Workflow): Promise<WorkflowResult>;
  streamResponse(prompt: string): AsyncGenerator<ResponseChunk>;
}

interface ExecutionResult {
  output: string;
  metadata: ExecutionMetadata;
  toolsUsed: Tool[];
  executionTime: number;
}
