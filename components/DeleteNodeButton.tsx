'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { deleteNode } from "@/app/actions/nodes"

export function DeleteNodeButton({ hardwareId }: { hardwareId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    // Confirm before deleting
    if (!window.confirm("Are you sure you want to permanently delete this hardware node?")) {
      return;
    }

    setIsDeleting(true);
    const res = await deleteNode(hardwareId);
    
    if (!res.success) {
      alert("Failed to delete node.");
      setIsDeleting(false);
    }
    // Agar success ho gaya to page auto-refresh ho jayega Server Action ki wajah se
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleDelete}
      disabled={isDeleting}
      className="h-8 w-8 p-0 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
      title="Delete Node"
    >
      {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
    </Button>
  )
}