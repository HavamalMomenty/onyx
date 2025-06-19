"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import WorkflowLayout from "./WorkflowLayout";
import QueryBox from "./components/QueryBox";
import FileUploader from "./components/FileUploader";
import RunButton from "./components/RunButton";
import ResultDisplay from "./components/ResultDisplay";
import { WorkflowRunType } from "./types";

// Define model endpoints per workflow type
const MODEL_ENDPOINTS: Record<string, string> = {
  "Evaluate Property": "http://localhost:8001/api/evaluateProperty",
  "Extract Rental Data": "http://localhost:8002/api/extractRental",
  "Underwrite Property": "http://localhost:8003/api/underwrite",
  // Add more workflows and their respective endpoints here
  "default": "http://localhost:8000/api/default"
};

export default function WorkflowPage() {
  const searchParams = useSearchParams();
  
  const [workflowTitle, setWorkflowTitle] = useState<string>("Workflow");
  const [workflowDescription, setWorkflowDescription] = useState<string>("Upload files and enter a query to run this workflow.");
  const [modelEndpoint, setModelEndpoint] = useState<string>(MODEL_ENDPOINTS.default);
  
  const [query, setQuery] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasRun, setHasRun] = useState<boolean>(false);
  const [workflowResult, setWorkflowResult] = useState<any>(null);
  
  // History and run state
  const [isLoadingPreviousRun, setIsLoadingPreviousRun] = useState<boolean>(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  
  // Get workflow details from URL parameters
  useEffect(() => {
    const title = searchParams.get('title');
    const description = searchParams.get('description');
    
    if (title) {
      setWorkflowTitle(title);
      // Set the appropriate model endpoint based on workflow title
      setModelEndpoint(MODEL_ENDPOINTS[title] || MODEL_ENDPOINTS.default);
    }
    
    if (description) {
      setWorkflowDescription(description);
    }
  }, [searchParams]);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
  };

  const handleFilesUploaded = (files: File[]) => {
    setUploadedFiles(files);
  };
  
  // Load a previous workflow run by ID
  const loadPreviousRun = useCallback(async (runId: string) => {
    if (isLoadingPreviousRun || !runId) return;
    
    try {
      setIsLoadingPreviousRun(true);
      setSelectedRunId(runId);
      
      // Get workspace files for this run
      const filesResponse = await fetch(`/api/workflow/files?runId=${encodeURIComponent(runId)}`);
      
      if (!filesResponse.ok) {
        throw new Error("Failed to load workspace files");
      }
      
      const filesData = await filesResponse.json();
      
      // Find the first markdown file to display by default
      const workspaceFiles = filesData.files || [];
      let firstMdFile = workspaceFiles.find((file: string) => file.toLowerCase().endsWith('.md'));
      let fileContent = '# No content available';
      
      if (firstMdFile) {
        // Load the content of the first markdown file
        const contentResponse = await fetch('/api/workflow/files', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filePath: firstMdFile }),
        });
        
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          fileContent = contentData.content || '# No content available';
        }
      }
      
      // Get basic run info from the history endpoint
      const historyResponse = await fetch(`/api/workflow/history`);
      let runInfo = null;
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        runInfo = historyData.runs.find(run => run.id === runId);
      }
      
      // Set the workflow result
      setWorkflowResult({
        id: runId,
        timestamp: runInfo?.timestamp || new Date().toISOString(),
        query: runInfo?.query || "",
        filesCount: workspaceFiles.length,
        workflowType: runInfo?.workflowType || "Unknown workflow",
        result: fileContent,
        workspaceFiles: workspaceFiles
      });
      
      setHasRun(true);
    } catch (error: unknown) {
      console.error('Error loading previous run:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to load previous run: ${errorMessage}`);
    } finally {
      setIsLoadingPreviousRun(false);
    }
  }, [isLoadingPreviousRun]);

  const handleRunWorkflow = useCallback(async () => {
    // No longer require query to be non-empty
    if (uploadedFiles.length === 0) return;
    
    setIsRunning(true);
    
    try {
      console.log(`Executing workflow: ${workflowTitle} with ${uploadedFiles.length} files`);
      
      // Create form data for API call
      const formData = new FormData();
      formData.append('workflowType', workflowTitle);
      
      // Only append query if it's not empty
      if (query.trim() !== "") {
        formData.append('query', query);
      }
      
      // Add files to form data
      uploadedFiles.forEach((file, index) => {
        formData.append(`file-${index}`, file);
      });
      
      // Call our workflow execution API
      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Workflow execution failed');
      }
      
      const result = await response.json();
      
      // Set the workflow result
      setWorkflowResult({
        id: result.id,
        timestamp: new Date().toISOString(),
        query: query,
        filesCount: uploadedFiles.length,
        workflowType: workflowTitle,
        result: result.markdownContent || '# No results available',
        workspaceFiles: result.workspaceFiles || []
      });
      
      setHasRun(true);
    } catch (error) {
      console.error('Error executing workflow:', error);
      alert(`Workflow execution failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  }, [query, uploadedFiles, workflowTitle]);

  // Set current run ID when workflow completes successfully
  useEffect(() => {
    if (workflowResult?.id) {
      setSelectedRunId(workflowResult.id);
    }
  }, [workflowResult?.id]);

  // No additional UI controls needed - history is now in main sidebar

  return (
    <WorkflowLayout 
      onSelectRun={loadPreviousRun}
      currentRunId={selectedRunId}
    >
      <div className="flex-1 h-full overflow-hidden p-4">
        <div className="flex flex-col md:flex-row h-full transition-all duration-300 gap-4">
          <div className={`flex flex-col ${hasRun ? 'md:w-1/2' : 'w-full'} bg-background p-4 rounded-lg transition-all duration-300 ${isLoadingPreviousRun ? 'opacity-50 pointer-events-none' : ''}`}>
            <h1 className="text-2xl font-bold mb-2">Workflow Runner</h1>
            <h2 className="text-xl font-semibold mb-2 text-blue-600">{workflowTitle}</h2>
            <p className="text-gray-600 mb-4">{workflowDescription}</p>
            <p className="text-sm text-gray-500 mb-4">Please upload relevant files and enter your query to begin.</p>
            
            <div className="mb-6">
              <QueryBox value={query} onChange={handleQueryChange} disabled={isRunning || isLoadingPreviousRun} />
            </div>
            
            <div className="mb-6 flex-grow">
              <FileUploader onFilesUploaded={handleFilesUploaded} disabled={isRunning || isLoadingPreviousRun} />
            </div>
            
            <div className="flex justify-center">
              <RunButton 
                onClick={handleRunWorkflow} 
                isRunning={isRunning || isLoadingPreviousRun} 
                disabled={isRunning || isLoadingPreviousRun || uploadedFiles.length === 0} 
                className="px-6 py-3 text-base"
              />
            </div>
          </div>
          
          {(hasRun || isLoadingPreviousRun) && (
            <div className="md:w-1/2 bg-background p-4 rounded-lg">
              <ResultDisplay result={workflowResult} />
            </div>
          )}
        </div>
      </div>
    </WorkflowLayout>
  );
}
