// web-dashboard/app/workflows/builder/page.tsx
import { Suspense } from "react"
import { WorkflowEditor } from "@/components/WorkflowEditor"
import { Sidebar } from "@/components/Sidebar" 
import { getWorkflowById } from "@/app/actions/workflows"

// 🔴 THE FIX 1: Next.js 15+ mein 'searchParams' ek Promise hota hai
export default async function WorkflowBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }> // 👈 Promise wrap kar diya
}) {
  
  // 🔴 THE FIX 2: searchParams ko pehle await karna padega
  const resolvedSearchParams = await searchParams;
  const workflowId = resolvedSearchParams.id;

  let initialData: any = null;
  
  if (workflowId) {
    // DB se data nikalo
    initialData = await getWorkflowById(workflowId);
  }

  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-background overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col p-6 lg:p-8 h-screen overflow-hidden w-full">
        <header className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              {initialData ? `Editing: ${initialData.name}` : "Workflow Builder"}
            </h2>
            <p className="text-muted-foreground font-medium mt-1">
              Design, sequence, and configure your automation blocks without writing code.
            </p>
          </div>
        </header>

        <div className="flex-1 pb-4 relative">
           <Suspense fallback={
             <div className="flex flex-col items-center justify-center h-full w-full border border-border rounded-xl bg-card/30 shadow-sm">
               <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4 shadow-sm" />
               <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">
                 Initializing Engine...
               </p>
             </div>
           }>
             {/* 🔴 DATA INJECTION: Pura data direct editor ko pass kar diya! */}
             <WorkflowEditor initialData={initialData} />
           </Suspense>
        </div>
      </main>
    </div>
  )
}