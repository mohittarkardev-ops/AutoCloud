import clientPromise from "@/lib/mongodb"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  MonitorSmartphone, PlayCircle, Activity, 
  CheckCircle2, Wifi, WifiOff, ArrowUpRight, Zap 
} from "lucide-react"
import Link from "next/link"
import { Sidebar } from "@/components/Sidebar"

export const dynamic = 'force-dynamic';

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

export default async function Home() {
  const stats = await getDashboardStats();

  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-background">
      <Sidebar />

      <main className="flex-1 p-8 lg:p-12 max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-2">System Fleet</h2>
            <p className="text-muted-foreground font-medium">Monitoring {stats.approvedNodes} authorized automation nodes.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 mr-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">PC</div>
              ))}
            </div>
            <Link href="/builder">
              <Button className="rounded-full px-6 h-11 font-bold shadow-xl shadow-primary/20 gap-2">
                <Zap size={16} fill="currentColor" /> Deploy Task
              </Button>
            </Link>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          <StatCard 
            title="Live Wrappers" 
            value={stats.onlineNodes} 
            subtitle="Pinging Now" 
            icon={Wifi} 
            color="text-emerald-500" 
            pulse 
          />
          <StatCard 
            title="Active Duties" 
            value={stats.runningTasks} 
            subtitle="Executing Tasks" 
            icon={Activity} 
            color="text-blue-500" 
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
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              Live Feed <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
            </h3>
            <Link href="/nodes" className="group text-sm font-bold text-muted-foreground hover:text-primary flex items-center gap-1">
              Management Center <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
          
          <div className="grid gap-4">
            {stats.recentActivity.length === 0 ? (
              <Card className="border-dashed py-20 flex flex-col items-center justify-center text-muted-foreground bg-transparent">
                <Activity size={40} className="mb-4 opacity-20" />
                <p className="font-bold text-lg">Waiting for connection...</p>
                <p className="text-sm">No heartbeats detected in the last cycle.</p>
              </Card>
            ) : (
              stats.recentActivity.map((node) => {
                const isLive = (new Date().getTime() - new Date(node.lastSeen).getTime()) < 90000;
                return (
                  <Card key={node._id.toString()} className="group hover:shadow-md transition-all duration-300 border-none bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between p-5">
                        <div className="flex items-center gap-5">
                          <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors shadow-inner",
                            isLive ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
                          )}>
                            {isLive ? <Wifi size={22} /> : <WifiOff size={22} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                               <p className="font-bold text-lg">{node.alias || node.hostname}</p>
                               {isLive && <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
                            </div>
                            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MonitorSmartphone size={14} /> {node.hardwareId.substring(0, 12)}
                              </span>
                              {node.assignedWorkflow ? (
                                <span className="bg-primary/5 text-primary px-2 py-0.5 rounded text-[11px] font-bold">
                                  {node.assignedWorkflow.name}
                                </span>
                              ) : <span className="text-[11px]">Standby</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{new Date(node.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mt-1">Last Contact</p>
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

function StatCard({ title, value, subtitle, icon: Icon, color = "text-foreground", pulse = false }: any) {
  return (
    <Card className="border-none shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden group hover:translate-y-[-2px] transition-all">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("p-3 rounded-xl bg-background shadow-sm", color)}>
            <Icon size={20} className={pulse ? "animate-pulse" : ""} />
          </div>
          <Zap size={14} className="text-muted-foreground/30" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-black mb-1">{value}</h3>
          <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 italic">
            {subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function cn(...inputs: any) {
  return inputs.filter(Boolean).join(" ");
}