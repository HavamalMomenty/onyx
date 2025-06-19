export interface WorkflowRunType {
  id: string;
  timestamp: string;
  query: string;
  filesCount: number;
  result: string;
  workspaceFiles?: string[];
  selectedFile?: string;
}
