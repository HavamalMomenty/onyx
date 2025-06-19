/**
 * Client-side Workflow Executor
 * Browser-compatible version that uses API endpoints instead of direct file system access
 */

// API endpoints
const API_BASE_PATH = '/api/workflow';

/**
 * List all files in the workspace directory via API
 */
export async function listWorkspaceFiles(runId: string): Promise<string[]> {
  try {
    const response = await fetch(`/api/workflow/files?runId=${encodeURIComponent(runId)}`);
    
    if (!response.ok) {
      console.error('Error listing workspace files:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error listing workspace files:', error);
    return [];
  }
}

/**
 * Read file content via API
 */
export async function readFileContent(filePath: string): Promise<string> {
  try {
    const response = await fetch('/api/workflow/files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath }),
    });
    
    if (!response.ok) {
      return `# Error\n\nFailed to load file: ${response.statusText}`;
    }
    
    const data = await response.json();
    return data.content || '# No content';
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return `# Error\n\nThere was an error reading the file.`;
  }
}

/**
 * Main workflow execution function
 */
export async function executeWorkflow(
  workflowType: string, 
  files: File[],
  query?: string
): Promise<{
  id: string;
  markdownContent: string;
  stdout: string;
  stderr: string;
  workspaceFiles: string[];
}> {
  try {
    // Create form data for API call
    const formData = new FormData();
    formData.append('workflowType', workflowType);
    
    // Only append query if it's not empty
    if (query?.trim()) {
      formData.append('query', query);
    }
    
    // Add files to form data
    files.forEach((file, index) => {
      formData.append(`file-${index}`, file);
    });
    
    // Call our workflow execution API
    const response = await fetch(`${API_BASE_PATH}/execute`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Workflow execution failed');
    }
    
    const result = await response.json();
    const runId = result.id;
    
    // Get workspace files
    const workspaceFiles = await listWorkspaceFiles(runId);
    
    return {
      id: runId,
      markdownContent: result.markdownContent || '# Workflow Completed\n\nThe workflow was executed, but no output content was generated.',
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      workspaceFiles
    };
  } catch (error) {
    console.error('Workflow execution error:', error);
    throw error;
  }
}
