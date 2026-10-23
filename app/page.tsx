// web-dashboard/app/page.tsx
import clientPromise from "@/lib/mongodb"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  MonitorSmartphone, Activity, 
  CheckCircle2, Wifi, WifiOff, ArrowUpRight, Zap 
} from "lucide-react"
import Link from "next/link"
import { Sidebar } from "@/components/Sidebar"

export const dynamic = 'force-dynamic';

// ─── UTILITY FUNCTION (Kept intact exactly as you designed) ───
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

// ─── DATABASE FETCH LOGIC ───
async function getDashboardStats() {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");
    const now = new Date().getTime();
    const allDevices = await db.collection("devices").find({}).toArray();
    
    const onlineNodes = allDevices.filter(d => (now - new Date(d.lastSeen).getTime()) < 90000).length;
    const approvedNodes = allDevices.filter(d => d.status === "approved").length;
    const runningTasks = allDevices.filter(d => d.assignedWorkflow !== null).length;
    const recentActivity = await db.collection("devices").find({}).sort({ lastSeen: -1 }).limit(6).toArray();

    return { onlineNodes, approvedNodes, runningTasks, recentActivity, isDbConnected: true };
  } catch (error) {
    return { onlineNodes: 0, approvedNodes: 0, runningTasks: 0, recentActivity: [], isDbConnected: false };
  }
}

// ─── MAIN COMPONENT ───
export default async function Home() {
  const stats = await getDashboardStats();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-4xl font-medium tracking-tight mb-1.5">System Fleet</h2>
            <p className="text-muted-foreground">Monitoring {stats.approvedNodes} authorized automation nodes.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 mr-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-9 w-9 rounded-full border-2 border-background bg-brand-100 text-brand-900 flex items-center justify-center text-[10px] font-semibold">PC</div>
              ))}
            </div>
            <Link href="/builder">
              <Button size="lg" className="shadow-lg shadow-primary/20 gap-2">
                <Zap size={16} fill="currentColor" /> Deploy Task
              </Button>
            </Link>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard 
            hero
            title="Live Wrappers" 
            value={stats.onlineNodes} 
            subtitle="Pinging Now" 
            icon={Wifi} 
            pulse 
          />
          <StatCard 
            title="Active Duties" 
            value={stats.runningTasks} 
            subtitle="Executing Tasks" 
            icon={Activity} 
          />
          <StatCard 
            title="Total Nodes" 
            value={stats.approvedNodes} 
            subtitle="Approved HW" 
            icon={MonitorSmartphone} 
          />
          <StatCard 
            title="Cloud Health" 
            value={stats.isDbConnected ? "Stable" : "Down"} 
            subtitle="Atlas Connectivity" 
            icon={CheckCircle2} 
            color={stats.isDbConnected ? "text-primary" : "text-red-500"}
          />
        </div>
        
        {/* Monitoring Feed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-medium flex items-center gap-2">
              Live Feed <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
            </h3>
            <Link href="/nodes" className="group text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-1">
              Management Center <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
          
          {/* Two columns on large screens so the whole feed fits on one screen */}
          <div className="grid gap-3 lg:grid-cols-2">
            {stats.recentActivity.length === 0 ? (
              <Card className="lg:col-span-2 border-dashed py-16 flex flex-col items-center justify-center text-muted-foreground bg-transparent">
                <Activity size={40} className="mb-4 opacity-20" />
                <p className="font-medium text-lg">Waiting for connection...</p>
                <p className="text-sm">No heartbeats detected in the last cycle.</p>
              </Card>
            ) : (
              stats.recentActivity.map((node) => {
                const isLive = (new Date().getTime() - new Date(node.lastSeen).getTime()) < 90000;
                
                return (
                  <Card key={node._id.toString()} className="group py-0 hover:bg-accent/40 transition-colors duration-200 border-none overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-4 min-w-0">
                          
                          {/* Live/Offline Icon Wrapper */}
                          <div className={cn(
                            "h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition-colors",
                            isLive ? "bg-brand-100 text-brand-700" : "bg-red-500/10 text-red-500"
                          )}>
                            {isLive ? <Wifi size={20} /> : <WifiOff size={20} />}
                          </div>
                          
                          {/* Node Details */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                               <p className="font-medium text-base truncate">{node.alias || node.hostname}</p>
                               {isLive && <div className="h-2 w-2 rounded-full bg-brand-600 animate-pulse" />}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MonitorSmartphone size={14} /> {node.hardwareId.substring(0, 12)}
                              </span>
                              {node.assignedWorkflow ? (
                                <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full text-[11px] font-medium truncate">
                                  {node.assignedWorkflow.name}
                                </span>
                              ) : <span className="text-[11px]">Standby</span>}
                            </div>
                          </div>
                        </div>
                        
                        {/* Timestamp */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium">{new Date(node.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-[10px] uppercase font-medium tracking-widest text-muted-foreground mt-0.5">Last Contact</p>
                        </div>
                        
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </section>

      </main>
    </div>
  )
}

// ─── UI COMPONENT: STAT CARD (first one is the green "hero" card) ───
function StatCard({ title, value, subtitle, icon: Icon, color = "text-foreground", pulse = false, hero = false }: any) {
  return (
    <Card className={cn(
      "py-0 border-none overflow-hidden transition-all hover:-translate-y-0.5",
      hero && "bg-hero-green text-white"
    )}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <p className={cn("text-base font-medium", hero ? "text-white" : "text-foreground")}>{title}</p>
          <div className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center",
            hero ? "bg-white text-brand-700" : cn("border border-primary/40", color)
          )}>
            <Icon size={16} className={pulse ? "animate-pulse" : ""} />
          </div>
        </div>
        <h3 className="text-5xl font-medium tracking-tight mb-2">{value}</h3>
        <p className={cn("text-xs", hero ? "text-brand-200" : "text-muted-foreground")}>
          {subtitle}
        </p>
      </CardContent>
    </Card>
  )
}
