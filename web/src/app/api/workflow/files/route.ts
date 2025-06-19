import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Base directory for database storage
const DATABASE_DIR = process.env.DATABASE_DIR || '/home/adrian_user/database';

/**
 * List files in a workspace directory
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get('runId');
  
  if (!runId) {
    return NextResponse.json({ error: 'Run ID is required' }, { status: 400 });
  }
  
  const baseDir = path.join(DATABASE_DIR, runId);
  const workspaceDir = path.join(baseDir, 'workspace_dir');
  
  if (!fs.existsSync(workspaceDir)) {
    return NextResponse.json({ error: 'Workspace directory does not exist', files: [] }, { status: 404 });
  }
  
  try {
    // List all files in workspace directory (non-recursive)
    const files = fs.readdirSync(workspaceDir)
      .filter(file => {
        const filePath = path.join(workspaceDir, file);
        return fs.statSync(filePath).isFile(); // Only include files, not directories
      })
      .map(file => path.join(workspaceDir, file)); // Return full paths
    
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error listing workspace files:', error);
    return NextResponse.json({ error: 'Failed to list files', files: [] }, { status: 500 });
  }
}

/**
 * Read file content
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { filePath } = body;
  
  if (!filePath) {
    return NextResponse.json({ error: 'File path is required' }, { status: 400 });
  }
  
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json({ content });
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return NextResponse.json({ error: `Failed to read file ${filePath}` }, { status: 500 });
  }
}
