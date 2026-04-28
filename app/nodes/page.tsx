// web-dashboard/app/nodes/page.tsx
import clientPromise from "@/lib/mongodb"
import { Cpu } from "lucide-react"
import { Sidebar } from "@/components/Sidebar"
import { NodesTableClient } from "@/components/NodesTableClient"
import { CreateGroupModal } from "@/components/CreateGroupModal" // 🔴 NAYA IMPORT

export const dynamic = 'force-dynamic';

// 🔴 THE FIX: TypeScript को बताएँ कि डिवाइस डेटा का स्ट्रक्चर कैसा है
interface DeviceNode {
  _id: string;
  lastSeen: string;
  status: string;
  [key: string]: any; // इसके अलावा जो भी डायनामिक डेटा हो, उसे पास होने दो
}

async function getDevices(): Promise<DeviceNode[]> {
  const client = await clientPromise;
  const db = client.db("automation_db");
  const devices = await db.collection("devices").find({}).sort({ lastSeen: -1 }).toArray();
  
  // Server se Client me bhejne ke liye data serialize karna padta hai
  return devices.map((d: any) => ({
    ...d,
    _id: d._id.toString(),
    lastSeen: new Date(d.lastSeen).toISOString(),
    status: d.status || 'pending' // 🔴 TypeScript के लिए status को explicitly मैप किया
  })) as DeviceNode[];
}

export default async function NodesPage() {
  const devices = await getDevices();
  
  // 🔴 NAYA: Sirf approved nodes ko filter karo group banane ke liye
  const approvedNodes = devices.filter(d => d.status === 'approved');

  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-background">
      <Sidebar />

      <main className="flex-1 p-8 lg:p-12 max-w-7xl mx-auto w-full">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-2">Hardware Nodes</h2>
            <p className="text-muted-foreground font-medium">Remote control and real-time monitoring of connected machines.</p>
          </div>
          
          {/* 🔴 NAYA: Flex container banaya taaki badge aur button saath mein aayein */}
          <div className="flex items-center gap-3">
            <div className="bg-muted/40 p-1.5 rounded-2xl border border-border/50">
              <div className="px-4 py-2 flex items-center gap-2">
                 <Cpu size={16} className="text-muted-foreground"/>
                 <span className="text-sm font-bold">{devices.length} Total Nodes</span>
              </div>
            </div>

            {/* 🔴 NAYA: Create Group Modal Button yahan lagaya */}
            <CreateGroupModal approvedNodes={approvedNodes} />
          </div>
        </header>

        {/* Client Component Call */}
        <NodesTableClient initialDevices={devices} />

      </main>
    </div>
  )
}