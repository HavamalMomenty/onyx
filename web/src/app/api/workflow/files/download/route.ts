import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { Readable } from 'stream';

// Database directory - place where all workflow runs are stored
const DATABASE_DIR = process.env.DATABASE_DIR || '/home/adrian_user/database';

export async function GET(request: NextRequest) {
  try {
    // Get runId from query parameters
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get('runId');

    if (!runId) {
      return NextResponse.json(
        { error: 'Run ID is required' },
        { status: 400 }
      );
    }

    // Find the workspace directory for this run
    const workspaceDir = path.join(DATABASE_DIR, runId, 'workspace_dir');
    
    // Check if directory exists
    if (!fs.existsSync(workspaceDir)) {
      return NextResponse.json(
        { error: 'Workspace directory not found' },
        { status: 404 }
      );
    }

    // Create a zip archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    const chunks: Buffer[] = [];
    
    // Collect data chunks
    archive.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    
    // Return the zip file when archiving is complete
    const complete = new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      
      archive.on('error', (err) => {
        reject(err);
      });
    });
    
    // Add the workspace directory to the archive
    archive.directory(workspaceDir, false);
    
    // Finalize the archive
    archive.finalize();
    
    // Wait for the archive to be created
    const zipBuffer = await complete;
    
    // Return the zip file with appropriate headers
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=workspace-${runId}.zip`
      }
    });
  } catch (error) {
    console.error('Error creating zip file:', error);
    return NextResponse.json(
      { error: 'Failed to create zip file' },
      { status: 500 }
    );
  }
}
