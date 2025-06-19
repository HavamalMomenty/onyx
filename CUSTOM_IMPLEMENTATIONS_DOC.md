# CUSTOM IMPLEMENTATIONS DOCUMENTATION

### UI
Currently implemented:

#### Workflow Page Implementation
- **New Files and Components:**
  - `/web/src/app/workflow/page.tsx` - Main workflow page that handles state and layout
  - `/web/src/app/workflow/WorkflowLayout.tsx` - Layout component with sidebar consistent with the app
  - `/web/src/app/workflow/types.ts` - TypeScript definitions for workflow data structures
  - `/web/src/app/workflow/components/QueryBox.tsx` - Input component for workflow query with separate backend
  - `/web/src/app/workflow/components/FileUploader.tsx` - Handles drag-and-drop file/folder upload with local storage
  - `/web/src/app/workflow/components/RunButton.tsx` - Styled button component for running workflows
  - `/web/src/app/workflow/components/ResultDisplay.tsx` - Displays markdown results in split-screen view

#### Template UI Components
- **Existing Components (Now Updated):**
  - `web/src/components/ui/WorkflowButton.tsx` - Clickable workflow component that redirects to the workflow page
  - `web/src/components/ui/TemplatesSection.tsx` - Container for workflow templates in the sidebar
  - `web/src/app/chat/ChatPage.tsx` - Main chat page, modified to include workflow template section

### Agentic Workflow
