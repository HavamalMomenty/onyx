"use client";

import React, { useState, useEffect } from "react";
import { WorkflowRunType } from "../types";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { FiCalendar, FiClock, FiFileText, FiFile, FiDownload, FiPackage } from "react-icons/fi";
import { readFileContent } from "../utils/workflowExecutor";
import 'highlight.js/styles/github.css';

interface ResultDisplayProps {
  result: WorkflowRunType | null;
}

export default function ResultDisplay({ result }: ResultDisplayProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileDisplayName, setFileDisplayName] = useState<string>(""); 
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Get the basename of a file path
  const getBasename = (filePath: string) => {
    return filePath.split('/').pop() || filePath;
  };

  // Effect to load file content when selected file changes
  useEffect(() => {
    async function loadFileContent() {
      if (selectedFile) {
        setIsLoading(true);
        try {
          // Read the file content via API
          const content = await readFileContent(selectedFile);
          setFileContent(content);
          setFileDisplayName(getBasename(selectedFile));
        } catch (error) {
          console.error("Error reading file:", error);
          setFileContent("# Error\n\nFailed to load file content.");
        } finally {
          setIsLoading(false);
        }
      }
    }
    
    loadFileContent();
  }, [selectedFile]);

  // Effect to select the first file by default when results load
  useEffect(() => {
    if (result?.workspaceFiles?.length) {
      // Default to selecting the first .md file if available
      const mdFile = result.workspaceFiles.find(file => file.toLowerCase().endsWith('.md'));
      const firstFile = mdFile || result.workspaceFiles[0];
      setSelectedFile(firstFile);
    }
  }, [result?.workspaceFiles]);
  
  // Handle file download
  const handleDownloadFile = () => {
    if (!selectedFile) return;
    
    // Create a download link for the current file content
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileDisplayName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Handle download all files as zip
  const handleDownloadAllFiles = () => {
    if (!result?.id) return;
    
    // Create a download link for all files
    const downloadUrl = `/api/workflow/files/download?runId=${result.id}`;
    window.open(downloadUrl, '_blank');
  };

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-neutral-500">
          <p>No workflow results to display</p>
        </div>
      </div>
    );
  }

  // Format the timestamp for display
  const formattedDate = new Date(result.timestamp).toLocaleDateString();
  const formattedTime = new Date(result.timestamp).toLocaleTimeString();

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold">Results</h2>
        <div className="flex space-x-3 text-sm text-neutral-500">
          <div className="flex items-center">
            <FiCalendar className="mr-1 h-4 w-4" />
            {formattedDate}
          </div>
          <div className="flex items-center">
            <FiClock className="mr-1 h-4 w-4" />
            {formattedTime}
          </div>
        </div>
      </div>
      
      {/* Tabs for file navigation */}
      {result.workspaceFiles && result.workspaceFiles.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <div className="flex space-x-2 pb-2 border-b border-neutral-200 dark:border-neutral-700">
            {result.workspaceFiles.map((file, index) => {
              const basename = getBasename(file);
              const isSelected = file === selectedFile;
              const fileExt = basename.split('.').pop()?.toLowerCase() || '';
              
              return (
                <button
                  key={index}
                  onClick={() => setSelectedFile(file)}
                  className={`px-3 py-1 rounded-t-md text-sm flex items-center whitespace-nowrap ${isSelected ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  title={basename}
                >
                  <FiFile className="mr-1 h-4 w-4" />
                  {basename}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected file name and download buttons */}
      {selectedFile && (
        <div className="mb-4 flex justify-between items-center">
          <div className="font-medium text-blue-600 dark:text-blue-400">
            {fileDisplayName}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleDownloadFile}
              className="flex items-center px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm"
              title="Download this file"
            >
              <FiDownload className="mr-1 h-4 w-4" />
              Download File
            </button>
            <button
              onClick={handleDownloadAllFiles}
              className="flex items-center px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm"
              title="Download all files"
            >
              <FiPackage className="mr-1 h-4 w-4" />
              Download All
            </button>
          </div>
        </div>
      )}

      {/* File content with enhanced markdown */}
      <div className="flex-grow overflow-auto border border-neutral-200 dark:border-neutral-700 rounded-md p-4 markdown-container bg-white dark:bg-neutral-900">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse">Loading content...</div>
          </div>
        ) : selectedFile ? (
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize, rehypeHighlight]}
            className="prose prose-blue max-w-none dark:prose-invert"
          >
            {fileContent}
          </ReactMarkdown>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize, rehypeHighlight]}
            className="prose prose-blue max-w-none dark:prose-invert"
          >
            {result.result}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
