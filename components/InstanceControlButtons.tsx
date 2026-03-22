'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Square, RefreshCw, Loader2 } from "lucide-react"
import { sendNodeCommand } from "@/app/actions/nodes"

interface Props {
  hardwareId: string;
  port: string;
  isApproved: boolean;
  pendingCommand?: string | null;
}

export function InstanceControlButtons({ hardwareId, port, isApproved, pendingCommand }: Props) {
  const [loadingCmd, setLoadingCmd] = useState<string | null>(null);

  const handleCommand = async (cmd: "START" | "STOP" | "RESTART") => {
    setLoadingCmd(cmd);
    
    // 🔴 NAYA: Yahan port pass kar rahe hain
    const res = await sendNodeCommand(hardwareId, cmd, port);
    
    if (res.success) {
      console.log(`${cmd} command sent to ${hardwareId} on port ${port}`);
    } else {
      console.error("Failed to send command");
    }
    
    setLoadingCmd(null);
  }

  if (!isApproved) {
    return (
      <div className="flex items-center gap-1 opacity-50 pointer-events-none">
        <Button variant="ghost" size="icon" className="h-8 w-8"><Play size={14} /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8"><Square size={14} /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8"><RefreshCw size={14} /></Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg w-fit border shadow-sm">
      <Button 
        variant="ghost" 
        size="icon" 
        className={`h-7 w-7 rounded-md hover:bg-emerald-500/20 hover:text-emerald-600 transition-colors ${pendingCommand === 'START' ? 'bg-emerald-500/20 text-emerald-600' : ''}`}
        onClick={() => handleCommand("START")}
        disabled={!!loadingCmd}
        title={`Start Port ${port}`}
      >
        {loadingCmd === "START" ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} className={pendingCommand === 'START' ? 'fill-current' : ''} />}
      </Button>

      <Button 
        variant="ghost" 
        size="icon" 
        className={`h-7 w-7 rounded-md hover:bg-red-500/20 hover:text-red-600 transition-colors ${pendingCommand === 'STOP' ? 'bg-red-500/20 text-red-600' : ''}`}
        onClick={() => handleCommand("STOP")}
        disabled={!!loadingCmd}
        title={`Emergency Stop Port ${port}`}
      >
        {loadingCmd === "STOP" ? <Loader2 size={13} className="animate-spin" /> : <Square size={13} className={pendingCommand === 'STOP' ? 'fill-current' : ''} />}
      </Button>

      <Button 
        variant="ghost" 
        size="icon" 
        className={`h-7 w-7 rounded-md hover:bg-blue-500/20 hover:text-blue-600 transition-colors ${pendingCommand === 'RESTART' ? 'bg-blue-500/20 text-blue-600' : ''}`}
        onClick={() => handleCommand("RESTART")}
        disabled={!!loadingCmd}
        title={`Restart Port ${port}`}
      >
        {loadingCmd === "RESTART" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} className={pendingCommand === 'RESTART' ? 'animate-spin' : ''} />}
      </Button>
    </div>
  )
}