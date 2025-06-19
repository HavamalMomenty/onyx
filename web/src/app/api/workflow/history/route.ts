import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Database directory - place where all workflow runs are stored
const DATABASE_DIR = process.env.DATABASE_DIR || '/home/adrian_user/database';

// Interface for workflow run history item
interface WorkflowRunHistory {
  id: string;
  timestamp: string;
  query: string;
  workflowType: string;
  filesCount: number;
  hasResults: boolean;
}

/**
 * GET handler for workflow history
 */
export async function GET() {
  try {
    // Check if database directory exists
    if (!fs.existsSync(DATABASE_DIR)) {
      return NextResponse.json({ runs: [] });
    }

    // Read all subdirectories in the database directory
    // Each subdirectory represents a workflow run
    const entries = fs.readdirSync(DATABASE_DIR, { withFileTypes: true });
    const dirs = entries
      .filter(entry => entry.isDirectory())
      .map(dir => dir.name);
    
    // Extract workflow run information from each directory
    const runs: WorkflowRunHistory[] = [];
    
    for (const dir of dirs) {
      const runPath = path.join(DATABASE_DIR, dir);
      const workspacePath = path.join(runPath, 'workspace_dir');
      const configPath = path.join(runPath, 'configs', 'config.yaml');
      
      // Skip if workspace directory doesn't exist
      if (!fs.existsSync(workspacePath)) continue;
      
      // Check if config file exists to extract query
      let query = '';
      let workflowType = '';
      let timestamp = '';
      
      if (fs.existsSync(configPath)) {
        try {
          const configContent = fs.readFileSync(configPath, 'utf-8');
          // Extract query and workflow type from config
          const queryMatch = configContent.match(/user_query:\\s*["']?([^"']*)["']?/);
          if (queryMatch && queryMatch[1]) {
            query = queryMatch[1];
          }
          
          const typeMatch = configContent.match(/workflow_type:\\s*["']?([^"']*)["']?/);
          if (typeMatch && typeMatch[1]) {
            workflowType = typeMatch[1];
          }
          
          // Try to get timestamp from config or directory stats
          const timeMatch = configContent.match(/timestamp:\\s*["']?([^"']*)["']?/);
          if (timeMatch && timeMatch[1]) {
            timestamp = timeMatch[1];
          }
        } catch (err) {
          console.error(`Error reading config for run ${dir}:`, err);
        }
      }
      
      // If no timestamp in config, use directory creation time
      if (!timestamp) {
        try {
          const stats = fs.statSync(runPath);
          timestamp = stats.birthtime.toISOString();
        } catch (err) {
          timestamp = new Date().toISOString(); // Fallback
        }
      }
      
      // Count files in workspace directory
      let filesCount = 0;
      try {
        const files = fs.readdirSync(workspacePath, { withFileTypes: true });
        filesCount = files.filter(file => file.isFile()).length;
      } catch (err) {
        console.error(`Error counting files for run ${dir}:`, err);
      }
      
      // Check if there are markdown files (results)
      let hasResults = false;
      try {
        const files = fs.readdirSync(workspacePath);
        hasResults = files.some(file => file.toLowerCase().endsWith('.md'));
      } catch (err) {
        console.error(`Error checking for results in run ${dir}:`, err);
      }
      
      runs.push({
        id: dir,
        timestamp,
        query,
        workflowType,
        filesCount,
        hasResults
      });
    }
    
    // Sort runs by timestamp (most recent first)
    runs.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    return NextResponse.json({ runs });
  } catch (error) {
    console.error('Error getting workflow history:', error);
    return NextResponse.json(
      { error: 'Failed to get workflow history' },
      { status: 500 }
    );
  }
}
