// web-dashboard/components/DeleteWorkflowButton.tsx
'use client'
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteWorkflow } from "@/app/actions/workflows"
import { useTransition } from "react"

export function DeleteWorkflowButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button 
      variant="outline" size="sm" 
      className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
      disabled={isPending}
      onClick={() => {
        if(confirm("Are you sure?")) {
          startTransition(async () => { await deleteWorkflow(id); });
        }
      }}
    >
      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 size={14} />}
    </Button>
  )
}