// web-dashboard/app/workflows/builder/page.tsx
import { Suspense } from "react"
import { WorkflowEditor } from "@/components/WorkflowEditor"
import { Sidebar } from "@/components/Sidebar" 

export default function WorkflowBuilderPage() {
  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-background overflow-hidden">
      
      {/* 🔴 Shared Global Sidebar */}
      <Sidebar />

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col p-6 lg:p-8 h-screen overflow-hidden w-full">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              Workflow Builder
            </h2>
            <p className="text-muted-foreground font-medium mt-1">
              Design, sequence, and configure your automation blocks without writing code.
            </p>
          </div>
        </header>

        {/* React Flow / Builder Canvas Container */}
        <div className="flex-1 pb-4 relative">
           {/* 🔴 THE FIX: Wrapped in Suspense so Next.js can resolve URL params dynamically.
             Beautiful fallback loader added while the heavy canvas initializes.
           */}
           <Suspense fallback={
             <div className="flex flex-col items-center justify-center h-full w-full border border-border rounded-xl bg-card/30 shadow-sm">
               <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4 shadow-sm" />
               <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">
                 Initializing Engine...
               </p>
             </div>
           }>
             <WorkflowEditor />
           </Suspense>
        </div>
        
      </main>

    </div>
  )
}