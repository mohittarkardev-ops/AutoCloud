// web-dashboard/components/ExportWorkflowButton.tsx
'use client'

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export function ExportWorkflowButton({ workflow }: { workflow: any }) {
  const handleExport = () => {
    // 1. Backup ke liye saaf-suthra data format karo
    const exportData = {
      name: `${workflow.name} (Imported)`,
      description: workflow.description || "Restored from backup",
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
    };

    // 2. JSON ko Blob me convert karke download karwao
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflow.name.replace(/\s+/g, '_')}_backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport}
      className="h-8 gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50 text-[11px] font-bold shadow-sm transition-transform hover:-translate-y-0.5"
    >
      <Download size={13} /> Export
    </Button>
  )
}