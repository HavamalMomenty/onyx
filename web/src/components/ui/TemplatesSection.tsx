// /home/adrian_user/onyx/web/src/components/ui/TemplatesSection.tsx
import React from 'react';
import WorkflowButton from './WorkflowButton';

interface TemplatesSectionProps {
  className?: string;
}

const TemplatesSection: React.FC<TemplatesSectionProps> = ({ className }) => {
  return (
    <div className={`w-full ${className || ''}`}>
      <div className="space-y-4">
        <WorkflowButton 
          title="Evaluate Property"
          description="This workflow analyzes a property from an investment perspective. Output is a 1-5 page document highlighting critical investment metrics."
        />
        <WorkflowButton 
          title="Extract Rental Data"
          description="Extracts all rental data and stores it in connected database"
        />
        <WorkflowButton 
          title="Underwrite Property"
          description="Produce an underwriting model for the property. Output is an excel file describing RoI and key financial metrics."
        />
      </div>
    </div>
  );
};

export default TemplatesSection;
