// web-dashboard/app/workflows/builder/page.tsx
import { Suspense } from "react"
import { WorkflowEditor } from "@/components/WorkflowEditor"
import { Sidebar } from "@/components/Sidebar" 
import { getWorkflowById } from "@/app/actions/workflows"

export default async function WorkflowBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  
  const resolvedSearchParams = await searchParams;
  const workflowId = resolvedSearchParams.id;

  let initialData: any = null;
  
  if (workflowId) {
    initialData = await getWorkflowById(workflowId);
  }

  return (
    // 🔴 FIX 1: 'h-screen' ensures the app doesn't push past the monitor, keeping the sidebar locked
    <div className="flex h-screen bg-[#fafafa] dark:bg-background overflow-hidden">
      <Sidebar />

      {/* 🔴 FIX 2: Changed 'overflow-hidden' to 'overflow-y-auto' so you can scroll down when zoomed in! */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 h-full overflow-y-auto w-full">
        <header className="flex justify-between items-center mb-4 lg:mb-6 shrink-0">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {initialData ? `Editing: ${initialData.name}` : "Workflow Builder"}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground font-medium mt-1">
              Design, sequence, and configure your automation blocks without writing code.
            </p>
          </div>
        </header>

        {/* 🔴 FIX 3: 'min-h-[600px]' prevents the canvas from crushing into nothing on tiny screens */}
        <div className="flex-1 pb-4 relative min-h-[600px]">
           <Suspense fallback={
             <div className="flex flex-col items-center justify-center h-full w-full border border-border rounded-xl bg-card/30 shadow-sm">
               <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4 shadow-sm" />
               <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">
                 Initializing Engine...
               </p>
             </div>
           }>
             <WorkflowEditor initialData={initialData} />
           </Suspense>
        </div>
      </main>
    </div>
  )
}