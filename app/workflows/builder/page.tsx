// web-dashboard/app/workflows/builder/page.tsx
import { Suspense } from "react"
import { WorkflowEditor } from "@/components/WorkflowEditor"
import { Sidebar } from "@/components/Sidebar" 
import { getWorkflowById } from "@/app/actions/workflows" // 👈 NAYA IMPORT (Jo humne pichle step me banaya tha)

// 🔴 THE FIX: Next.js 'searchParams' direct page component me deta hai
export default async function WorkflowBuilderPage({
  searchParams,
}: {
  searchParams: { id?: string }
}) {
  
  // 🔴 THE MAGIC: Server-Side Fetching
  // Browser tak page pahunchne se pehle hi database se heavy JSON (nodes/edges) nikal lo!
  // 🔴 THE FIX: Added ': any' to bypass TypeScript's strict type checking
  let initialData: any = null;
  if (searchParams.id) {
    initialData = await getWorkflowById(searchParams.id);
  }

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
              {/* 🔴 UX UPGRADE: Agar edit kar rahe hain to Workflow ka naam dikhao */}
              {initialData ? `Editing: ${initialData.name}` : "Workflow Builder"}
            </h2>
            <p className="text-muted-foreground font-medium mt-1">
              Design, sequence, and configure your automation blocks without writing code.
            </p>
          </div>
        </header>

        {/* React Flow / Builder Canvas Container */}
        <div className="flex-1 pb-4 relative">
           <Suspense fallback={
             <div className="flex flex-col items-center justify-center h-full w-full border border-border rounded-xl bg-card/30 shadow-sm">
               <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4 shadow-sm" />
               <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">
                 Initializing Engine...
               </p>
             </div>
           }>
             {/* 🔴 DATA INJECTION: Pura data direct editor ko pass kar diya. No client-side loading! */}
             <WorkflowEditor initialData={initialData} />
           </Suspense>
        </div>
        
      </main>

    </div>
  )
}