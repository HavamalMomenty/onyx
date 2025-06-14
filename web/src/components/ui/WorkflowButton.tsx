// /home/adrian_user/onyx/web/src/components/ui/WorkflowButton.tsx
import React, { useState } from 'react';
import { cn } from "@/lib/utils";

interface WorkflowButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  className?: string;
}

const WorkflowButton = React.forwardRef<HTMLDivElement, WorkflowButtonProps>(
  ({ className, title = "Evaluate Property", description = "This workflow analyzes a property from an investment perspective. Output is a 1-5 page document highlighting critical investment metrics of the property.", ...props }, ref) => {
    const [showHi, setShowHi] = useState(false);

    const handleClick = () => {
      setShowHi(!showHi);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "w-full h-32 bg-neutral-800 rounded-lg cursor-pointer flex flex-col items-start justify-center p-4 shadow-sm hover:bg-neutral-700 transition-colors",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        <div className="text-base font-bold mb-2" style={{color: '#ffffff'}}>
          {title}
        </div>
        <div className="text-xs text-neutral-400 text-left max-w-[95%]">
          {description}
        </div>

        {showHi && (
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-8 bg-white/95 dark:bg-neutral-800/95 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50"
          >
            <strong className="text-3xl">HI</strong>
          </div>
        )}
      </div>
    );
  }
);

WorkflowButton.displayName = "WorkflowButton";

export default WorkflowButton;
