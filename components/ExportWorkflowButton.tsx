// web-dashboard/components/ExportWorkflowButton.tsx
'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { getWorkflowById } from "@/app/actions/workflows" // 👈 NAYA IMPORT

export function ExportWorkflowButton({ id, name }: { id: string, name: string }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 1. 🔴 THE MAGIC: Sirf click hone par hi heavy data server se mangwao!
      const fullWorkflow: any = await getWorkflowById(id);
      
      if (!fullWorkflow) {
        alert("Failed to fetch workflow data. Please try again.");
        return;
      }

      // 2. Backup ke liye saaf-suthra data format karo (Purani DB IDs ko hata kar)
      const exportData = {
        name: `${fullWorkflow.name} (Imported)`,
        description: fullWorkflow.description || "Restored from backup",
        nodes: fullWorkflow.nodes || [],
        edges: fullWorkflow.edges || [],
      };

      // 3. JSON ko Blob me convert karke download karwao
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.replace(/\s+/g, '_')}_backup.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error", error);
      alert("Something went wrong during export.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport}
      disabled={isExporting}
      className="h-8 gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50 text-[11px] font-bold shadow-sm transition-transform hover:-translate-y-0.5 rounded-lg"
    >
      {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} 
      {isExporting ? "Exporting" : "Export"}
    </Button>
  )
}