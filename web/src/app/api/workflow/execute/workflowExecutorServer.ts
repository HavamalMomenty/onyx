/**
 * Server-side Workflow Executor
 * Used by API routes to execute workflows (can use Node.js modules)
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

// Create promisified versions of Node.js functions
const execPromise = util.promisify(exec);

// Base directories for database and scripts
const DATABASE_DIR = "/home/adrian_user/database";
const WORKFLOW_SCRIPTS_DIR = "/home/adrian_user/onyx/workflow_scripts";

/**
 * Generate a unique run ID using timestamp
 */
function generateRunId(): string {
  return `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Create input directory with unique ID and save uploaded files
 */
export async function saveUploadedFiles(files: File[], runId: string): Promise<string[]> {
  const baseDir = path.join(DATABASE_DIR, runId);
  const inputDir = path.join(baseDir, 'input');
  
  // Create directories if they don't exist
  if (!fs.existsSync(DATABASE_DIR)) {
    fs.mkdirSync(DATABASE_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir, { recursive: true });
  }
  
  // Process and save each file
  const savedFiles: string[] = [];
  
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const filePath = path.join(inputDir, file.name);
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    savedFiles.push(filePath);
  }
  
  return savedFiles;
}

/**
 * Run the specific workflow script for a workflow type
 */
export async function runWorkflowScript(
  workflowType: string, 
  runId: string, 
  files: string[],
  query?: string
): Promise<{stdout: string, stderr: string, displayContent: string}> {
  try {
    // Map workflow type to script file
    let scriptPath: string;
    switch(workflowType) {
      case "Evaluate Property":
        scriptPath = `${WORKFLOW_SCRIPTS_DIR}/run_evaluate_property.py`;
        break;
      case "Extract Rental Data":
        // Use evaluate property for now as a fallback
        scriptPath = `${WORKFLOW_SCRIPTS_DIR}/run_evaluate_property.py`;
        break;
      case "Underwrite Property":
        // Use evaluate property for now as a fallback
        scriptPath = `${WORKFLOW_SCRIPTS_DIR}/run_evaluate_property.py`;
        break;
      default:
        scriptPath = `${WORKFLOW_SCRIPTS_DIR}/run_evaluate_property.py`;
    }
    
    // Check if the script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Workflow script not found: ${scriptPath}`);
    }
    
    // Pass query as an environment variable if it exists
    const env = { ...process.env };
    if (query) {
      env.OPENMANUS_QUERY = query;
    }
    
    // Run the workflow script
    const { stdout, stderr } = await execPromise(
      `python3 ${scriptPath} --run_id ${runId}`,
      { 
        cwd: '/home/adrian_user/onyx',
        env
      }
    );
    
    // Look for output files - our script will create files in workspace_dir
    const workspaceDir = path.join(DATABASE_DIR, runId, 'workspace_dir');
    let displayContent = '';
    
    // Try to find any markdown file
    let mdFiles: string[] = [];
    if (fs.existsSync(workspaceDir)) {
      mdFiles = fs.readdirSync(workspaceDir)
        .filter(file => file.toLowerCase().endsWith('.md'))
        .map(file => path.join(workspaceDir, file));
    }
    
    if (mdFiles.length > 0) {
      // Prioritize certain files
      const priorityFiles = ['IC_report.md', 'results_overview.md', 'summary.md'];
      let fileToShow = mdFiles[0]; // default to first file
      
      for (const pFile of priorityFiles) {
        const fullPath = path.join(workspaceDir, pFile);
        if (mdFiles.includes(fullPath)) {
          fileToShow = fullPath;
          break;
        }
      }
      
      displayContent = fs.readFileSync(fileToShow, 'utf-8');
    } else {
      displayContent = '# Workflow Completed\n\nNo markdown files were found in the workspace directory.';
    }
    
    return { stdout, stderr, displayContent };
  } catch (error) {
    console.error('Error executing workflow script:', error);
    throw error;
  }
}

/**
 * List files in the workspace directory
 */
export function listWorkspaceFiles(runId: string): string[] {
  const workspaceDir = path.join(DATABASE_DIR, runId, 'workspace_dir');
  
  if (!fs.existsSync(workspaceDir)) {
    return [];
  }
  
  return fs.readdirSync(workspaceDir)
    .map(file => path.join(workspaceDir, file))
    .filter(filePath => fs.statSync(filePath).isFile());
}

/**
 * Read file content
 */
export function readFileContent(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return `# File Not Found\n\nThe file ${filePath} was not found.`;
  }
  
  return fs.readFileSync(filePath, 'utf-8');
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
  selectedFile?: string;
}> {
  try {
    // 1. Generate unique run ID
    const runId = generateRunId();
    
    // 2. Save uploaded files to input directory
    const savedFiles = await saveUploadedFiles(files, runId);
    
    // 3. Execute the workflow script
    const { stdout, stderr, displayContent } = await runWorkflowScript(workflowType, runId, savedFiles, query);
    
    // 4. List files in workspace directory
    const workspaceFiles = listWorkspaceFiles(runId);
    
    // 5. Find the first markdown file to select by default
    let selectedFile = undefined;
    for (const file of workspaceFiles) {
      if (file.toLowerCase().endsWith('.md')) {
        selectedFile = file;
        break;
      }
    }
    
    // 6. Return the results
    return {
      id: runId,
      markdownContent: displayContent || '# Workflow Completed\n\nThe workflow was executed, but no output content was generated.',
      stdout,
      stderr,
      workspaceFiles,
      selectedFile
    };
  } catch (error) {
    console.error('Workflow execution error:', error);
    throw error;
  }
}
