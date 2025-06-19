"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { RiSettings4Line, RiDashboardLine } from "react-icons/ri";
import { FiHash } from "react-icons/fi";
import WorkflowHistory from "./components/WorkflowHistory";

interface WorkflowLayoutProps {
  children: React.ReactNode;
  onSelectRun?: (runId: string) => void;
  currentRunId?: string;
}

export default function WorkflowLayout({ children, onSelectRun, currentRunId }: WorkflowLayoutProps) {
  const pathname = usePathname();
  
  // Check if we're inside a workflow template (e.g., /workflow?title=Evaluate%20Property)
  const isInsideWorkflowTemplate = pathname === "/workflow" && typeof window !== "undefined" && window.location.search.includes("title=");
  
  // Show workflow history only on the workflow page
  const isWorkflowPage = pathname === "/workflow";

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-14 md:w-64 bg-background-sidebar border-r border-neutral-200 dark:border-neutral-700 flex-shrink-0 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="p-4">
            <Link href="/">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-neutral-800 dark:bg-white rounded-md flex items-center justify-center">
                  <span className="text-white dark:text-neutral-800 font-bold">T</span>
                </div>
                <span className="hidden md:block font-semibold text-lg">Thylander</span>
              </div>
            </Link>
          </div>
          
          <nav className="flex-1 px-2 py-4 space-y-2">
            <Link href="/chat" className="flex items-center px-2 py-2 text-sm font-medium rounded-md hover:bg-background-chat-hover">
              <RiDashboardLine className="mr-3 h-5 w-5" />
              <span className="hidden md:block">Chat</span>
            </Link>
            
            <Link 
              href="/workflow" 
              className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                pathname === "/workflow" ? "bg-background-chat-selected" : "hover:bg-background-chat-hover"
              }`}
            >
              <FiHash className="mr-3 h-5 w-5" />
              <span className="hidden md:block">Workflow</span>
            </Link>

            <div className="border-t border-neutral-200 dark:border-neutral-700 my-2"></div>

            {/* Only show Settings link when not in a workflow template */}
            {!isInsideWorkflowTemplate && (
              <Link href="#settings" className="flex items-center px-2 py-2 text-sm font-medium rounded-md hover:bg-background-chat-hover">
                <RiSettings4Line className="mr-3 h-5 w-5" />
                <span className="hidden md:block">Settings</span>
              </Link>
            )}
            
            {/* Show workflow history in the sidebar when on the workflow page */}
            {isWorkflowPage && (
              <div className="mt-4 px-2 flex-grow overflow-hidden hidden md:block">
                <h3 className="px-2 text-xs uppercase tracking-wider text-neutral-500 font-medium mb-2">Workflow History</h3>
                <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
                  {onSelectRun && (
                    <WorkflowHistory 
                      onSelectRun={onSelectRun}
                      currentRunId={currentRunId}
                    />
                  )}
                </div>
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
