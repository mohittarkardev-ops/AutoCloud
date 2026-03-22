// web-dashboard/app/builder/page.tsx
import clientPromise from "@/lib/mongodb"
import { Cpu, Zap } from "lucide-react"
import { TaskBuilderClient } from "@/components/TaskBuilderClient"
import { getWorkflows } from "@/app/actions/workflows" 
import { Sidebar } from "@/components/Sidebar"
import { Card, CardContent } from "@/components/ui/card"

export const dynamic = 'force-dynamic';

// Approved PCs fetch function
async function getApprovedNodes() {
  const client = await clientPromise;
  const db = client.db("automation_db");
  return await db.collection("devices").find({ status: "approved" }).toArray();
}

export default async function BuilderPage() {
  // 1. Approved PCs fetch karo
  const approvedNodes = await getApprovedNodes();
  const serializedNodes = approvedNodes.map(node => ({
    ...node,
    _id: node._id.toString()
  }));

  // 2. Database se asli Workflows fetch karo
  const dbWorkflows = await getWorkflows();

  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-background">
      
      {/* Naya Client-Side Sidebar Component */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-12 max-w-7xl mx-auto w-full">
        
        {/* Header (Updated to Executive Theme) */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-2">Assign Tasks</h2>
            <p className="text-muted-foreground font-medium">Deploy your saved workflows to authorized hardware nodes.</p>
          </div>
          
          {/* Quick Stats Badge in Header */}
          <div className="flex items-center gap-3 bg-muted/40 p-1.5 rounded-2xl border border-border/50">
            <div className="px-4 py-2 flex items-center gap-4">
               <div className="flex items-center gap-1.5">
                 <Cpu size={15} className="text-muted-foreground"/>
                 <span className="text-sm font-bold">{approvedNodes.length} Ready Nodes</span>
               </div>
               <div className="h-4 w-px bg-border"></div>
               <div className="flex items-center gap-1.5">
                 <Zap size={15} className="text-primary"/>
                 <span className="text-sm font-bold text-primary">{dbWorkflows.length} Workflows</span>
               </div>
            </div>
          </div>
        </header>

        {/* Task Builder Area Wrap */}
        <Card className="border-none shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden">
           <CardContent className="p-6 md:p-8">
              {/* Humara Client Component - Ab isme Nodes aur Workflows dono bhej rahe hain */}
              <TaskBuilderClient approvedNodes={serializedNodes} dbWorkflows={dbWorkflows} />
           </CardContent>
        </Card>

      </main>
    </div>
  )
}