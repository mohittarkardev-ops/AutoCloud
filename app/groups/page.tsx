// web-dashboard/app/groups/page.tsx
import clientPromise from "@/lib/mongodb"
import { Layers } from "lucide-react"
import { Sidebar } from "@/components/Sidebar"
import { GroupsClient } from "@/components/GroupsClient"

export const dynamic = 'force-dynamic';

async function getGroupsData() {
  const client = await clientPromise;
  const db = client.db("automation_db");
  
  const groups = await db.collection("groups").find({}).sort({ createdAt: -1 }).toArray();
  
  // 🔴 THE FIX: सारे Approved Devices लाएँ, ताकि नए PC भी जोड़े जा सकें
  const allApprovedDevices = await db.collection("devices").find({ status: "approved" }).toArray();

  return {
    groups: groups.map(g => ({ 
      ...g, 
      _id: g._id.toString(), 
      createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : new Date().toISOString() 
    })),
    devices: allApprovedDevices.map(d => ({ 
      ...d, 
      _id: d._id.toString() 
    }))
  };
}

export default async function GroupsPage() {
  const { groups, devices } = await getGroupsData();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 p-8 lg:p-12 max-w-7xl mx-auto w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-2">Group Management</h2>
            <p className="text-muted-foreground font-medium">Manage your device fleets, view assigned nodes, and organize your infrastructure.</p>
          </div>
          
          <div className="bg-muted/40 p-1.5 rounded-2xl border border-border/50">
            <div className="px-4 py-2 flex items-center gap-2">
               <Layers size={16} className="text-primary"/>
               <span className="text-sm font-bold">{groups.length} Total Groups</span>
            </div>
          </div>
        </header>

        {/* Client Component for Interactivity */}
        <GroupsClient initialGroups={groups} allDevices={devices} />
      </main>
    </div>
  )
}