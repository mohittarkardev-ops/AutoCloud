import clientPromise from "@/lib/mongodb"
import { Cpu } from "lucide-react"
import { Sidebar } from "@/components/Sidebar"
import { NodesTableClient } from "@/components/NodesTableClient"
import { CreateGroupModal } from "@/components/CreateGroupModal"

export const dynamic = 'force-dynamic';

interface DeviceNode {
  _id: string;
  lastSeen: string;
  status: string;
  [key: string]: any; 
}

// 🔴 THE FIX: अब हम Devices के साथ-साथ Groups भी फेच करेंगे
async function getData() {
  const client = await clientPromise;
  const db = client.db("automation_db");
  
  // 1. Devices निकालें
  const devices = await db.collection("devices").find({}).sort({ lastSeen: -1 }).toArray();
  // 2. Groups निकालें
  const groups = await db.collection("groups").find({}).toArray();
  
  const serializedDevices = devices.map((d: any) => ({
    ...d,
    _id: d._id.toString(),
    lastSeen: new Date(d.lastSeen).toISOString(),
    status: d.status || 'pending' 
  })) as DeviceNode[];

  // Groups की ObjectId को String में बदलें
  const serializedGroups = groups.map((g: any) => ({
    ...g,
    _id: g._id.toString(),
    createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : new Date().toISOString()
  }));

  return { devices: serializedDevices, groups: serializedGroups };
}

export default async function NodesPage() {
  // 🔴 दोनों डेटा (devices और groups) को यहाँ रिसीव करें
  const { devices, groups } = await getData();
  
  const approvedNodes = devices.filter(d => d.status === 'approved');

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full min-w-0">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-4xl font-medium tracking-tight mb-1.5">Hardware Nodes</h2>
            <p className="text-muted-foreground">Remote control and real-time monitoring of connected machines.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-card p-1 rounded-full">
              <div className="px-4 py-2 flex items-center gap-2">
                 <Cpu size={16} className="text-muted-foreground"/>
                 <span className="text-sm font-bold">{devices.length} Total Nodes</span>
              </div>
            </div>

            <CreateGroupModal approvedNodes={approvedNodes} />
          </div>
        </header>

        {/* 🔴 THE FIX: अब deviceGroups={groups} को टेबल में पास करें */}
        <NodesTableClient initialDevices={devices} deviceGroups={groups} />

      </main>
    </div>
  )
}