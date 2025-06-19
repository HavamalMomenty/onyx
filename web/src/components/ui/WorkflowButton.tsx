// /home/adrian_user/onyx/web/src/components/ui/WorkflowButton.tsx
import React from 'react';
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';

interface WorkflowButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  className?: string;
}

const WorkflowButton = React.forwardRef<HTMLDivElement, WorkflowButtonProps>(
  ({ className, title = "Evaluate Property", description = "This workflow analyzes a property from an investment perspective. Output is a 1-5 page document highlighting critical investment metrics of the property.", ...props }, ref) => {
    const router = useRouter();
    
    const handleClick = () => {
      // Pass workflow title and description as URL parameters
      router.push(`/workflow?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`);
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

        {/* No modal, just redirects to workflow page */}
      </div>
    );
  }
);

WorkflowButton.displayName = "WorkflowButton";

export default WorkflowButton;
