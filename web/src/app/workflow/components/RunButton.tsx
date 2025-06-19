"use client";

import React from "react";
import { FiPlay } from "react-icons/fi";

interface RunButtonProps {
  onClick: () => void;
  isRunning: boolean;
  disabled?: boolean;
  className?: string;
}

export default function RunButton({ onClick, isRunning, disabled = false, className = '' }: RunButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-sm font-medium text-center inline-flex items-center justify-center text-white bg-agent rounded-lg hover:bg-agent-hovered focus:ring-2 focus:outline-none focus:ring-neutral-300 disabled:opacity-50 transition-all duration-200 min-w-32 ${className}`}
    >
      {isRunning ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Running...
        </>
      ) : (
        <>
          <FiPlay className="mr-2 h-4 w-4" />
          Run Workflow
        </>
      )}
    </button>
  );
}
