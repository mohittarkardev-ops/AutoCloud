// web-dashboard/app/workflows/page.tsx
import { Button } from "@/components/ui/button"
import { LayoutDashboard, MonitorSmartphone, PlayCircle, Settings, Network } from "lucide-react"
import Link from "next/link"
import { WorkflowEditor } from "@/components/WorkflowEditor"
import { Suspense } from "react" // 🔴 NAYA IMPORT

export default function WorkflowsPage() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/20 p-6 flex flex-col hidden md:flex">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-md">A</div>
          <h1 className="text-xl font-bold tracking-tight">AutoCloud</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start gap-3">
              <LayoutDashboard size={18} /> Overview
            </Button>
          </Link>
          <Link href="/nodes">
            <Button variant="ghost" className="w-full justify-start gap-3">
              <MonitorSmartphone size={18} /> Nodes & Devices
            </Button>
          </Link>
          <Link href="/builder">
            <Button variant="ghost" className="w-full justify-start gap-3">
              <PlayCircle size={18} /> Assign Tasks
            </Button>
          </Link>
          <Link href="/workflows">
            <Button variant="secondary" className="w-full justify-start gap-3">
              <Network size={18} /> Visual Builder
            </Button>
          </Link>
          <Button variant="ghost" className="justify-start gap-3">
            <Settings size={18} /> Settings
          </Button>
        </nav>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col p-8 pb-0 h-screen overflow-hidden">
        <header className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Workflow Builder</h2>
            <p className="text-muted-foreground mt-1">Design automation flows by connecting logic nodes.</p>
          </div>
        </header>

        {/* React Flow Canvas Container */}
        <div className="flex-1 pb-8">
           {/* 🔴 THE FIX: Wrapped in Suspense so Next.js can resolve URL params dynamically */}
           <Suspense fallback={<div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Loading Builder...</p></div>}>
             <WorkflowEditor />
           </Suspense>
        </div>
      </main>

    </div>
  )
}