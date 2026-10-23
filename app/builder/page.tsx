// web-dashboard/app/builder/page.tsx
import clientPromise from "@/lib/mongodb"
import { Cpu, Zap, Layers } from "lucide-react" // Added Layers icon for groups
import { TaskBuilderClient } from "@/components/TaskBuilderClient"
import { getWorkflows } from "@/app/actions/workflows" 
import { Sidebar } from "@/components/Sidebar"
import { Card, CardContent } from "@/components/ui/card"

export const dynamic = 'force-dynamic';

// 1. Fetch Approved PCs
async function getApprovedNodes() {
  const client = await clientPromise;
  const db = client.db("automation_db");
  return await db.collection("devices").find({ status: "approved" }).toArray();
}

// 2. 🔴 FIXED: Fetch Device Groups (Correct Collection Name)
async function getDeviceGroups() {
  const client = await clientPromise;
  const db = client.db("automation_db");
  // 🔴 "device_groups" की जगह "groups" कर दिया गया है
  return await db.collection("groups").find({}).toArray();
}

export default async function BuilderPage() {
  // Fetch Nodes
  const approvedNodes = await getApprovedNodes();
  const serializedNodes = approvedNodes.map(node => ({
    ...node,
    _id: node._id.toString(),
    lastSeen: node.lastSeen ? new Date(node.lastSeen).toISOString() : null, // 🔴 Safety for Date
  }));

  // Fetch Groups
  const deviceGroups = await getDeviceGroups();
  const serializedGroups = deviceGroups.map(group => ({
    ...group,
    _id: group._id.toString(),
    createdAt: group.createdAt ? new Date(group.createdAt).toISOString() : new Date().toISOString() // 🔴 Safety for Date
  }));

  // Fetch Workflows
  const dbWorkflows = await getWorkflows();

  return (
    <div className="flex min-h-screen bg-background">
      
      <Sidebar />

      <main className="flex-1 p-8 lg:p-12 max-w-7xl mx-auto w-full">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-2">Assign Tasks</h2>
            <p className="text-muted-foreground font-medium">Deploy your saved workflows to authorized nodes or device groups.</p>
          </div>
          
          {/* Quick Stats Badge (Updated to include Groups) */}
          <div className="flex items-center gap-3 bg-muted/40 p-1.5 rounded-2xl border border-border/50 hidden md:flex">
            <div className="px-4 py-2 flex items-center gap-4">
               <div className="flex items-center gap-1.5">
                 <Cpu size={15} className="text-muted-foreground"/>
                 <span className="text-sm font-bold">{approvedNodes.length} Nodes</span>
               </div>
               <div className="h-4 w-px bg-border"></div>
               
               {/* New Group Stat */}
               <div className="flex items-center gap-1.5">
                 <Layers size={15} className="text-blue-500"/>
                 <span className="text-sm font-bold text-blue-500">{deviceGroups.length} Groups</span>
               </div>
               <div className="h-4 w-px bg-border"></div>

               <div className="flex items-center gap-1.5">
                 <Zap size={15} className="text-primary"/>
                 <span className="text-sm font-bold text-primary">{dbWorkflows.length} Workflows</span>
               </div>
            </div>
          </div>
        </header>

        <Card className="border-none shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden">
           <CardContent className="p-6 md:p-8">
              {/* Passed deviceGroups as a new prop */}
              <TaskBuilderClient 
                approvedNodes={serializedNodes} 
                dbWorkflows={dbWorkflows} 
                deviceGroups={serializedGroups} 
              />
           </CardContent>
        </Card>

      </main>
    </div>
  )
}