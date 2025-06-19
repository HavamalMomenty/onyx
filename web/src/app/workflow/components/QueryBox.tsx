"use client";

import React, { useState } from "react";

interface QueryBoxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function QueryBox({ value, onChange, disabled = false }: QueryBoxProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="w-full">
      <label htmlFor="query" className="block text-sm font-medium mb-2">
        Enter your workflow query:
      </label>
      <div
        className={`relative rounded-md shadow-sm border ${
          isFocused
            ? "border-agent dark:border-agent"
            : "border-neutral-300 dark:border-neutral-600"
        } transition-colors`}
      >
        <textarea
          id="query"
          name="query"
          rows={3}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="What would you like to analyze in your documents?"
          className="block w-full rounded-md border-0 py-3 px-4 text-neutral-900 dark:text-neutral-100 bg-background dark:bg-background-dark outline-none resize-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
        />
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        This query will be processed by the local workflow model, not the main chat model.
      </p>
    </div>
  );
}
