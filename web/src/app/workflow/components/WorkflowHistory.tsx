"use client";

import React, { useState, useEffect } from "react";
import { FiCalendar, FiClock, FiFileText, FiFile, FiMessageSquare } from "react-icons/fi";

// Interface for workflow history item
interface WorkflowRunHistory {
  id: string;
  timestamp: string;
  query: string;
  workflowType: string;
  filesCount: number;
  hasResults: boolean;
}

interface WorkflowHistoryProps {
  onSelectRun: (runId: string) => void;
  currentRunId?: string;
}

export default function WorkflowHistory({ onSelectRun, currentRunId }: WorkflowHistoryProps) {
  const [historyItems, setHistoryItems] = useState<WorkflowRunHistory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch workflow history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/workflow/history");
        
        if (!response.ok) {
          throw new Error("Failed to fetch workflow history");
        }
        
        const data = await response.json();
        setHistoryItems(data.runs || []);
      } catch (err: any) {
        console.error("Error fetching workflow history:", err);
        setError(err.message || "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistory();
  }, []);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return "Unknown date";
    }
  };
  
  // Format time for display
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString();
    } catch {
      return "Unknown time";
    }
  };
  
  // Truncate text to specific length
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "No text";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };
  
  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg bg-white dark:bg-neutral-800">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-white dark:bg-neutral-800">
        <p className="text-red-500">Error loading workflow history: {error}</p>
      </div>
    );
  }
  
  if (historyItems.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-white dark:bg-neutral-800">
        <p className="text-neutral-500">No previous workflow runs found.</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <h2 className="text-xl font-bold mb-2">Workflow History</h2>
      <div className="overflow-y-auto flex-grow">
        {historyItems.map((item) => (
          <div 
            key={item.id}
            className={`mb-2 p-3 border rounded-lg cursor-pointer transition-colors ${
              currentRunId === item.id 
                ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700' 
                : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700'
            }`}
            onClick={() => onSelectRun(item.id)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {item.workflowType || "Unknown workflow"}
              </span>
              <div className="text-xs text-neutral-500">
                {item.hasResults ? (
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                    Results
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
                    No results
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center text-xs text-neutral-500 mb-1">
              <FiCalendar className="mr-1 h-3 w-3" />
              {formatDate(item.timestamp)}
              <span className="mx-1">•</span>
              <FiClock className="mr-1 h-3 w-3" />
              {formatTime(item.timestamp)}
            </div>
            
            <div className="flex items-start mb-1">
              <FiMessageSquare className="mr-1 h-3 w-3 mt-1 flex-shrink-0 text-neutral-500" />
              <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2">
                {item.query ? truncateText(item.query, 100) : "No query provided"}
              </p>
            </div>
            
            <div className="flex items-center text-xs text-neutral-500">
              <FiFileText className="mr-1 h-3 w-3" />
              {item.filesCount} {item.filesCount === 1 ? 'file' : 'files'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
