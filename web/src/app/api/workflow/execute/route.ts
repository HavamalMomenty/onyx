/**
 * API Route for executing OpenManus workflows
 * Handles file uploads and workflow execution 
 */

import { NextRequest, NextResponse } from 'next/server';
// Import the server-side workflow executor instead of client version
import { executeWorkflow } from './workflowExecutorServer';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const workflowType = formData.get('workflowType') as string;
    // Make query optional - if provided, it will be passed to the workflow script
    const query = formData.get('query') as string | undefined;
    
    if (!workflowType) {
      return NextResponse.json(
        { error: 'Missing workflow type' },
        { status: 400 }
      );
    }
    
    // Extract files
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file-') && value instanceof File) {
        files.push(value);
      }
    }
    
    // Execute the workflow
    const result = await executeWorkflow(workflowType, files, query);
    
    return NextResponse.json({
      id: result.id,
      markdownContent: result.markdownContent,
      stdout: result.stdout,
      stderr: result.stderr,
      status: 'success'
    });
  } catch (error) {
    console.error('Workflow execution error:', error);
    return NextResponse.json(
      { 
        error: 'Workflow execution failed', 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
