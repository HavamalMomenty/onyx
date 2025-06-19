"use client";

import React, { useState, useCallback, useRef } from "react";
import { FiUpload, FiFile, FiFolder, FiCheck, FiX } from "react-icons/fi";

interface FileUploaderProps {
  onFilesUploaded: (files: File[]) => void;
  disabled?: boolean;
}


export default function FileUploader({ onFilesUploaded, disabled = false }: FileUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadDir, setUploadDir] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  // Generate a timestamp-based directory name when component mounts
  React.useEffect(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    setUploadDir(`workflow-${timestamp}`);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setDragging(true);
  }, [disabled]);

  // Process files recursively from a directory entry
  const processDirectoryEntry = async (entry: any, path: string = "") => {
    if (entry.isFile) {
      return new Promise<File>((resolve) => {
        entry.file((file: File) => {
          // Create a new File object with the path information
          const fileWithPath = new File([file], path + file.name, {
            type: file.type,
            lastModified: file.lastModified,
          });
          resolve(fileWithPath);
        });
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      return new Promise<File[]>((resolve) => {
        dirReader.readEntries(async (entries: any[]) => {
          const files: File[] = [];
          for (const entry of entries) {
            const result = await processDirectoryEntry(entry, path + entry.name + "/");
            if (Array.isArray(result)) {
              files.push(...result);
            } else {
              files.push(result);
            }
          }
          resolve(files);
        });
      });
    }
    return [];
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    setDragging(false);
    
    const items = e.dataTransfer.items;
    if (!items) return;

    const newFiles: File[] = [];
    
    if (e.dataTransfer.items) {
      // Use DataTransferItemList interface
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) newFiles.push(file);
        }
      }
    } else {
      // Use DataTransfer interface
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file) newFiles.push(file);
      }
    }

    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  }, [disabled]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const selectedFiles = Array.from(e.target.files);
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
  };

  const updateFilesUploaded = useCallback(() => {
    onFilesUploaded(files);
  }, [files, onFilesUploaded]);

  React.useEffect(() => {
    updateFilesUploaded();
  }, [updateFilesUploaded]);

  const handleClickUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleClickUploadFolder = () => {
    if (dirInputRef.current) {
      dirInputRef.current.click();
    }
  };

  const removeFile = (index: number) => {
    setFiles((prevFiles) => {
      const newFiles = [...prevFiles];
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-2">Upload Files or Folders:</label>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-md p-6 transition-colors ${
          dragging
            ? "border-agent bg-neutral-100 dark:bg-neutral-800"
            : "border-neutral-300 dark:border-neutral-600"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="text-center">
          <FiUpload className="mx-auto h-12 w-12 text-neutral-400" />
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            Drop files or folders here
          </p>
          <p className="text-xs text-neutral-500">
            All files will be saved to local directory: {uploadDir}
          </p>
          <div className="mt-4 flex justify-center space-x-3">
            <button
              type="button"
              disabled={disabled}
              onClick={handleClickUpload}
              className="px-3 py-2 text-xs font-medium text-center inline-flex items-center text-white bg-agent rounded-lg hover:bg-agent-hovered focus:ring-2 focus:outline-none focus:ring-neutral-300 disabled:opacity-50"
            >
              <FiFile className="w-4 h-4 mr-1" />
              Select Files
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={handleClickUploadFolder}
              className="px-3 py-2 text-xs font-medium text-center inline-flex items-center text-white bg-agent rounded-lg hover:bg-agent-hovered focus:ring-2 focus:outline-none focus:ring-neutral-300 disabled:opacity-50"
            >
              <FiFolder className="w-4 h-4 mr-1" />
              Select Folder
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
        <input
          ref={dirInputRef}
          type="file"
          webkitdirectory="true"
          directory=""
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Selected Files ({files.length}):</h3>
          <div className="max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-md">
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {files.map((file, index) => (
                <li key={index} className="px-3 py-2 flex items-center justify-between text-sm">
                  <div className="flex items-center truncate">
                    <FiFile className="w-4 h-4 mr-2 text-neutral-400" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button 
                    onClick={() => removeFile(index)} 
                    className="ml-2 text-neutral-500 hover:text-red-500"
                    disabled={disabled}
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
