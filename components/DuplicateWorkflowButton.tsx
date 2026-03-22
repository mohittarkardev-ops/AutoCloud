// web-dashboard/components/DuplicateWorkflowButton.tsx
'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Loader2 } from "lucide-react"
import { duplicateWorkflow } from "@/app/actions/workflows" // Jo naya action humne banaya tha

export function DuplicateWorkflowButton({ id }: { id: string }) {
  const [isDuplicating, setIsDuplicating] = useState(false)

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    const res = await duplicateWorkflow(id)
    if (!res.success) {
      alert("Failed to duplicate workflow")
    }
    setIsDuplicating(false)
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleDuplicate}
      disabled={isDuplicating}
      className="h-8 gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-[11px] font-bold shadow-sm transition-transform hover:-translate-y-0.5"
    >
      {isDuplicating ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
      Duplicate
    </Button>
  )
}