'use client' 

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft, Monitor, Activity, Terminal, Clock, Loader2 } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { InstanceControlButtons } from "@/components/InstanceControlButtons" 

export default function InstanceMonitoringPage() {
  const params = useParams();
  const hardwareId = params.hardwareId as string;

  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/nodes/details?id=${hardwareId}`);
      const data = await res.json();
      if (data.success) {
        setDevice(data.node);
      }
    } catch (err) {
      console.error("Polling error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); 
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval);
  }, [hardwareId]);

  if (loading && !device) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-10 text-center flex flex-col items-center justify-center h-screen">
        <h1 className="text-red-500 font-bold text-4xl mb-4">404</h1>
        <p className="text-muted-foreground font-mono">Node {hardwareId} not found.</p>
        <Link href="/nodes" className="mt-6"><Button>Back to Fleet</Button></Link>
      </div>
    );
  }

  const now = new Date().getTime();
  const lastSeenDate = new Date(device.lastSeen).getTime();
  const isOnline = (now - lastSeenDate) < 30000;

  const liveMetrics = device.liveMetrics || {};
  const pendingCommands = device.pendingCommands || {};

  const portKeys = Object.keys(liveMetrics).filter(key => !isNaN(Number(key)));

  let instances: any[] = [];

  if (portKeys.length > 0) {
    // 🔴 THE FIX: Auto-Cleanup Logic (60 Seconds Timeout)
    instances = portKeys
      .filter((port) => {
        const metrics = liveMetrics[port];
        // Check if port has its own lastSeen timestamp
        if (metrics.lastSeen) {
          const portTime = new Date(metrics.lastSeen).getTime();
          return (now - portTime) < 60000; // 60 seconds tak signal nahi aaya toh hide kar do
        }
        // Fallback for old data without port-level lastSeen
        return isOnline; 
      })
      .map((port) => {
        const metrics = liveMetrics[port];
        return {
          id: port,
          port: port,
          // Kyunki filter pass hua hai, toh port definitely zinda (online) hai
          status: metrics.isExecuting ? 'running' : 'idle',
          currentStep: metrics.currentStatus?.currentStep || 'Ready to start',
          progress: metrics.currentStatus?.progress || 0,
          pendingCmd: pendingCommands[port] || null,
          logs: metrics.currentStatus?.lastLog ? [`[Live] ${metrics.currentStatus.lastLog}`] : ["Status: Waiting for activity..."]
        };
      });
  } else if (liveMetrics.currentPort && isOnline) {
    // Fallback for transition
    instances = [{
      id: liveMetrics.currentPort,
      port: liveMetrics.currentPort,
      status: liveMetrics.isExecuting ? 'running' : 'idle',
      currentStep: liveMetrics.currentStatus?.currentStep || 'Ready to start',
      progress: liveMetrics.currentStatus?.progress || 0,
      pendingCmd: pendingCommands[liveMetrics.currentPort] || null,
      logs: liveMetrics.currentStatus?.lastLog ? [`[Live] ${liveMetrics.currentStatus.lastLog}`] : ["Status: Waiting for activity..."]
    }];
  }

  return (
    <div className="flex min-h-screen w-full bg-[#fafafa] dark:bg-background flex-col p-8 transition-all duration-500">
      
      {/* Header Section */}
      <header className="flex items-center justify-between mb-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-6">
          <Link href="/nodes">
            <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-white">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black tracking-tight">{device.alias || device.hostname}</h2>
                {isOnline ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 animate-pulse">LIVE</Badge>
                ) : (
                    <Badge variant="outline" className="text-muted-foreground">OFFLINE</Badge>
                )}
            </div>
            <p className="text-muted-foreground font-mono text-xs mt-1 uppercase tracking-widest opacity-60">{device.hardwareId}</p>
          </div>
        </div>

        <Card className="px-4 py-2 flex items-center gap-3 border-none bg-white shadow-sm">
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Activity size={16} />
            </div>
            <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">System Status</p>
                <p className="text-sm font-black text-primary">{device.status.toUpperCase()}</p>
            </div>
        </Card>
      </header>

      {/* No Instances Fallback */}
      {instances.length === 0 && (
          <div className="max-w-7xl mx-auto w-full p-12 text-center bg-white border rounded-3xl border-dashed">
              <Monitor size={40} className="mx-auto text-muted-foreground opacity-30 mb-4" />
              <h3 className="text-lg font-bold">No Active Instances</h3>
              <p className="text-sm text-muted-foreground mt-2">No Worker Agents are currently active on this node.</p>
          </div>
      )}

      {/* Main Monitoring Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto w-full">
        {instances.map((ins) => (
          <Card key={ins.id} className="border-none shadow-xl shadow-black/5 flex flex-col h-[500px] overflow-hidden rounded-3xl bg-white border border-white">
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b px-8 pt-8">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${ins.status === 'running' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-muted text-muted-foreground'}`}>
                  <Monitor size={24} className={ins.status === 'running' ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <CardTitle className="text-xl font-black italic">PORT_{ins.port}</CardTitle>
                  <Badge className={`mt-1 px-3 py-0.5 rounded-full text-[10px] ${ins.status === 'running' ? 'bg-blue-600' : 'bg-zinc-400'}`}>
                    {ins.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              <InstanceControlButtons 
                hardwareId={device.hardwareId}
                port={ins.port}
                isApproved={device.status === 'approved'}
                pendingCommand={ins.pendingCmd}
              />
            </CardHeader>
            
            <CardContent className="p-0 flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Side: Progress & Status */}
              <div className="w-full md:w-1/3 p-8 bg-zinc-50 border-r flex flex-col justify-center">
                <div className="space-y-6">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-black text-zinc-400 uppercase">Task Progress</span>
                        <span className="text-2xl font-black text-blue-600">{ins.progress}%</span>
                    </div>
                    <div className="w-full bg-zinc-200 h-3 rounded-full overflow-hidden">
                        <div 
                            className="bg-blue-600 h-full transition-all duration-1000 ease-out" 
                            style={{ width: `${ins.progress}%` }}
                        />
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Clock size={16} className="text-blue-600" />
                            <p className="text-xs font-bold text-zinc-600 uppercase tracking-tighter">Current Step</p>
                        </div>
                        <p className="text-sm font-black mt-2 text-zinc-900 leading-tight">{ins.currentStep}</p>
                    </div>
                </div>
              </div>

              {/* Right Side: Console Logs */}
              <div className="flex-1 bg-[#0a0a0a] p-8 font-mono text-[13px] leading-relaxed relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-3 text-zinc-500 text-xs uppercase tracking-widest font-black">
                    <Terminal size={18} /> Raw_Logs
                  </div>
                  {ins.status === 'running' && <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />}
                </div>
                <ScrollArea className="h-[250px] pr-4">
                  {ins.logs.map((log: string, idx: number) => (
                    <div key={idx} className="text-zinc-400 mb-3 leading-snug flex gap-4 items-start group">
                      <span className="text-zinc-800 font-bold select-none group-hover:text-zinc-600 transition-colors">{idx+1}</span> 
                      <span className={log.includes('CRITICAL') || log.includes('Error') ? 'text-red-400' : 'group-hover:text-zinc-200 transition-colors'}>
                        {log}
                      </span>
                    </div>
                  ))}
                  {ins.status === 'running' && (
                    <div className="text-emerald-400 mt-4 flex items-center gap-3 font-bold bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 w-fit">
                      <Loader2 size={14} className="animate-spin" /> 
                      <span className="tracking-widest text-[11px]">STREAMING_LIVE</span>
                    </div>
                  )}
                </ScrollArea>
                
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-blue-600/5 to-transparent pointer-events-none" />
              </div>
            </CardContent>

          </Card>
        ))}
      </div>
    </div>
  )
}