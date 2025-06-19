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
    const response = await fetch(`${API_BASE_PATH}/files?runId=${encodeURIComponent(runId)}`);
    
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
    const response = await fetch(`${API_BASE_PATH}/files`, {
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
  
  // Workspace directory will be created by the Python script
  
  // Process and save each file
  const savedFiles = [];
  
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const filePath = path.join(inputDir, file.name);
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer)); // Buffer is acceptable for Node.js fs methods
    savedFiles.push(filePath);
  }
  
  return savedFiles;
}

/**
 * Read a TOML config file (simple parser)
 */
export function readConfig(configPath: string): Record<string, any> {
  const content = fs.readFileSync(configPath, 'utf-8');
  const config: Record<string, any> = {};
  
  let section = '';
  
  content.split('\n').forEach(line => {
    // Remove comments
    const commentPos = line.indexOf('#');
    if (commentPos !== -1) {
      line = line.substring(0, commentPos);
    }
    
    line = line.trim();
    if (!line) return;
    
    // Check for section
    const sectionMatch = line.match(/^\[(.*)\]$/);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      if (!config[section]) {
        config[section] = {};
      }
      return;
    }
    
    // Parse key-value pair
    const keyValueMatch = line.match(/^([^=]+)=(.*)$/);
    if (keyValueMatch) {
      const key = keyValueMatch[1].trim();
      let value = keyValueMatch[2].trim();
      
      // Handle quoted strings
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      } 
      // Handle multi-line strings
      else if (value.startsWith('"""')) {
        value = value.substring(3);
        // Multi-line strings would need more complex parsing
      }
      
      if (section) {
        config[section][key] = value;
      } else {
        config[key] = value;
      }
    }
  });
  
  return config;
}

/**
 * Update config file with input directory path and query if provided
 */
export async function updateConfig(
  configPath: string, 
  inputDir: string,
  query?: string
): Promise<void> {
  const content = fs.readFileSync(configPath, 'utf-8');
  const lines = content.split('\n');
  const updatedLines: string[] = [];
  
  let inRunflowSection = false;
  let queryUpdated = false;
  let inputDirUpdated = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check for runflow section (where query is typically located)
    if (line.trim() === '[runflow]') {
      inRunflowSection = true;
    } else if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
      inRunflowSection = false;
    }
    
    // Update input_dir anywhere in the file
    if (line.trim().startsWith('input_dir')) {
      line = `input_dir = "${inputDir}"`;
      inputDirUpdated = true;
    }
    
    // Update query in runflow section if provided
    if (query && inRunflowSection && line.trim().startsWith('query')) {
      // Find the opening and closing triple quotes
      const startQuotes = line.indexOf('"""');
      if (startQuotes !== -1) {
        // This is the start of a multi-line string
        let endQuotes = -1;
        let j = i;
        
        // Look for the ending quotes
        while (j < lines.length && endQuotes === -1) {
          endQuotes = lines[j].indexOf('"""', j === i ? startQuotes + 3 : 0);
          if (endQuotes === -1) j++;
        }
        
        if (endQuotes !== -1) {
          // Found the end quotes, replace everything in between
          const beforeQuery = line.substring(0, startQuotes + 3);
          updatedLines.push(`${beforeQuery}${query}"""`);
          i = j; // Skip to the line with the end quotes
          queryUpdated = true;
          continue;
        }
      } else if (line.includes('=')) {
        // Single-line query
        const parts = line.split('=');
        line = `${parts[0]}= "${query}"`;
        queryUpdated = true;
      }
    }
    
    updatedLines.push(line);
  }
  
  // Add input_dir if not found
  if (!inputDirUpdated) {
    updatedLines.push(`input_dir = "${inputDir}"`);
  }
  
  // Add query if not found and provided
  if (query && !queryUpdated) {
    updatedLines.push('[runflow]');
    updatedLines.push(`query = "${query}"`);
  }
  
  fs.writeFileSync(configPath, updatedLines.join('\n'));
}

/**
 * Run the specific workflow script for a workflow type
 */
export async function runWorkflowScript(workflowType: string, runId: string, files: string[]): Promise<{stdout: string, stderr: string, displayContent: string}> {
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
    
    // Run the workflow script - it handles everything including config modification
    const { stdout, stderr } = await execFilePromise(
      'python3',
      [scriptPath, '--run_id', runId],
      { cwd: '/home/adrian_user/onyx' } // Ensure CWD is where the script expects to be, or adjust script paths
    );
    
    // Look for output file to display - our script will have created appropriate files in the database dir
    const outputDir = path.join(DATABASE_DIR, runId, 'output');
    let displayContent = '';
    
    // Try to find any markdown file
    let mdFiles: string[] = [];
    if (fs.existsSync(outputDir)) {
      mdFiles = fs.readdirSync(outputDir).filter(file => file.endsWith('.md'));
    }
    
    if (mdFiles.length > 0) {
      // Prioritize certain files
      const priorityFiles = ['IC_report.md', 'results_overview.md', 'summary.md'];
      let fileToShow = mdFiles[0]; // default to first file
      
      for (const pFile of priorityFiles) {
        if (mdFiles.includes(pFile)) {
          fileToShow = pFile;
          break;
        }
      }
      
      displayContent = fs.readFileSync(path.join(outputDir, fileToShow), 'utf-8');
    } else {
      displayContent = '# Workflow Completed\n\nNo markdown files were found in the output directory.';
    }
    
    return { stdout, stderr, displayContent };
  } catch (error) {
    console.error('Error executing workflow script:', error);
    throw error;
  }
}

/**
 * Wait for a file to exist (with timeout)
 */
export async function waitForFile(filePath: string, timeout: number = 30000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (fs.existsSync(filePath)) {
      return true;
    }
    
    // Wait 500ms before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
}

/**
 * Extract output directory from config file
 */
export function getOutputDir(configPath: string): string {
  const config = readConfig(configPath);
  return config.output_dir || config.runflow?.output_dir || path.join(DATABASE_DIR, 'default', 'output');
}

/**
 * Read results_overview.md from output directory
 */
export async function readResults(outputDir: string): Promise<string> {
  const resultsPath = path.join(outputDir, 'results_overview.md');
  
  if (!fs.existsSync(resultsPath)) {
    return '# No results found\n\nThe workflow did not generate any results.';
  }
  
  return fs.readFileSync(resultsPath, 'utf-8');
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
}> {
  try {
    // 1. Generate unique run ID (using just UUID without timestamp to avoid nested directories)
    const runId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    
    // 2. Save uploaded files to input directory
    const savedFiles = await saveUploadedFiles(files, runId);
    
    // 3. Execute the workflow script (which handles config modification and OpenManus execution)
    // Pass query as an environment variable if it exists
    // Our Python script will handle this environment variable
    if (query) {
      process.env.OPENMANUS_QUERY = query;
    }
    
    const { stdout, stderr, displayContent } = await runWorkflowScript(workflowType, runId, savedFiles);
    
    // 4. Return the results
    return {
      id: runId,
      markdownContent: displayContent || '# Workflow Completed\n\nThe workflow was executed, but no output content was generated.',
      stdout,
      stderr
    };
  } catch (error) {
    console.error('Workflow execution error:', error);
    throw error;
  }
}
