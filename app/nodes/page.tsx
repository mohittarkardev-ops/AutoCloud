// web-dashboard/app/nodes/page.tsx
import clientPromise from "@/lib/mongodb"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { MonitorSmartphone, Ban, Layers, Wifi, WifiOff, Cpu } from "lucide-react"
import Link from "next/link"
import { NodeActionButtons } from "@/components/NodeActionButtons"
import { NodeConfigDialog } from "@/components/NodeConfigDialog"
import { DeleteNodeButton } from "@/components/DeleteNodeButton" 
import { Sidebar } from "@/components/Sidebar"

// Database se live data lane ka function
async function getDevices() {
  const client = await clientPromise;
  const db = client.db("automation_db");
  const devices = await db.collection("devices").find({}).sort({ lastSeen: -1 }).toArray();
  return devices;
}

export default async function NodesPage() {
  const devices = await getDevices();

  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-background">
      
      {/* Client-Side Sidebar Component */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-8 lg:p-12 max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-2">Hardware Nodes</h2>
            <p className="text-muted-foreground font-medium">Remote control and real-time monitoring of connected machines.</p>
          </div>
          <div className="flex items-center gap-3 bg-muted/40 p-1.5 rounded-2xl border border-border/50">
            <div className="px-4 py-2 flex items-center gap-2">
               <Cpu size={16} className="text-muted-foreground"/>
               <span className="text-sm font-bold">{devices.length} Total Nodes</span>
            </div>
          </div>
        </header>

        {/* Devices Table Wrap */}
        <Card className="border-none shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30 hover:bg-muted/30">
                <TableRow className="border-b border-border/50">
                  <TableHead className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Identity</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-widest text-muted-foreground">MAC ID</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Max Ports</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Assignment</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Last Sync</TableHead>
                  <TableHead className="text-right pr-6 font-bold text-xs uppercase tracking-widest text-muted-foreground">Access Mgt.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.length === 0 ? (
                  <TableRow>
                    {/* 🔴 NAYA: colSpan 8 se 7 kar diya kyuki command column hat gaya */}
                    <TableCell colSpan={7} className="text-center py-24 text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-muted/30 rounded-full">
                          <MonitorSmartphone size={40} className="opacity-20" />
                        </div>
                        <p className="font-bold text-lg">No endpoints detected</p>
                        <p className="text-sm">Run the Python wrapper locally to register a new machine.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map((device) => {
                    // --- REAL-TIME STATUS LOGIC ---
                    const lastSeenDate = new Date(device.lastSeen).getTime();
                    const now = new Date().getTime();
                    const isOnline = (now - lastSeenDate) < 90000; 

                    return (
                      <TableRow key={device._id.toString()} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                        
                        {/* 1. Hostname & Alias */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-base">{device.alias || device.hostname}</span>
                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{device.hostname}</span>
                          </div>
                        </TableCell>
                        
                        {/* 2. MAC Address */}
                        <TableCell>
                          <span className="font-mono text-[11px] font-semibold text-muted-foreground/80 bg-muted/50 px-2 py-1 rounded-md uppercase">
                            {device.hardwareId}
                          </span>
                        </TableCell>
                        
                        {/* 3. Live Status Badge */}
                        <TableCell>
                          {device.status === 'blocked' ? (
                            <Badge variant="destructive" className="gap-1 px-2.5 py-0.5 shadow-sm">
                              <Ban size={12} /> Blocked
                            </Badge>
                          ) : isOnline ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20 gap-1.5 px-2.5 py-0.5 shadow-sm">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Live
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border gap-1.5 px-2.5 py-0.5">
                              <WifiOff size={12} /> Offline
                            </Badge>
                          )}
                        </TableCell>

                        {/* 4. Max Instances (Ports) */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 bg-background border px-2 py-1 rounded-lg w-fit shadow-sm">
                            <span className="text-sm font-black">{device.maxInstances || 1}</span>
                          </div>
                        </TableCell>

                        {/* 5. Assigned Duty */}
                        <TableCell>
                          {device.assignedWorkflow ? (
                            <div className="flex flex-col max-w-[150px]">
                              <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-md truncate" title={device.assignedWorkflow.name}>
                                {device.assignedWorkflow.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-medium text-muted-foreground italic px-2 py-1 bg-muted/30 rounded-md">Standby</span>
                          )}
                        </TableCell>

                        {/* 🔴 COMMAND COLUMN HAS BEEN REMOVED */}

                        {/* 6. Last Seen */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[12px] font-bold">
                              {new Date(device.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">Today</span>
                          </div>
                        </TableCell>

                        {/* 7. Access Management Actions */}
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end items-center gap-2">
                            
                            {/* Go to Instance Monitoring */}
                            {device.status === 'approved' && (
                              <Link href={`/nodes/${device.hardwareId}`}>
                                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 text-[11px] font-bold shadow-sm transition-transform hover:-translate-y-0.5">
                                  <Layers size={13} /> Details
                                </Button>
                              </Link>
                            )}

                            <NodeConfigDialog 
                              hardwareId={device.hardwareId} 
                              currentAlias={device.alias || ""} 
                              currentMaxInstances={device.maxInstances || 1} 
                            />
                            
                            <NodeActionButtons 
                              hardwareId={device.hardwareId} 
                              currentStatus={device.status} 
                            />

                            {/* Delete Button */}
                            <div className="w-px h-4 bg-border mx-1"></div>
                            <DeleteNodeButton hardwareId={device.hardwareId} />

                          </div>
                        </TableCell>

                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

    </div>
  )
}