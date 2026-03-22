// web-dashboard/components/NodeActionButtons.tsx
'use client'

import { Button } from "@/components/ui/button"
import { updateNodeStatus } from "@/app/actions/nodes"
import { useTransition } from "react"
import { ShieldCheck, ShieldAlert } from "lucide-react"

export function NodeActionButtons({ hardwareId, currentStatus }: { hardwareId: string, currentStatus: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex justify-end gap-2">
      {/* Agar Pending hai ya Blocked hai, toh Approve/Unblock ka button dikhao */}
      {(currentStatus === 'pending' || currentStatus === 'blocked') && (
        <Button 
          size="sm" 
          variant="outline"
          className="h-8 bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:text-green-700"
          onClick={() => startTransition(() => updateNodeStatus(hardwareId, 'approved'))}
          disabled={isPending}
        >
          <ShieldCheck className="w-4 h-4 mr-1" />
          {currentStatus === 'blocked' ? "Unblock" : "Approve"}
        </Button>
      )}
      
      {/* Agar Approved ya Pending hai, toh Block ka button dikhao */}
      {(currentStatus === 'approved' || currentStatus === 'pending') && (
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
          onClick={() => startTransition(() => updateNodeStatus(hardwareId, 'blocked'))}
          disabled={isPending}
        >
           <ShieldAlert className="w-4 h-4 mr-1" />
           Block
        </Button>
      )}
    </div>
  )
}