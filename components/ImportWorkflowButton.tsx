// web-dashboard/components/ImportWorkflowButton.tsx
'use client'

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Loader2 } from "lucide-react"
import { saveWorkflow } from "@/app/actions/workflows" // Apni purani Server action
import { useRouter } from "next/navigation"

export function ImportWorkflowButton() {
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsImporting(true);
        const json = JSON.parse(event.target?.result as string);

        // JSON file se data nikalo
        const name = json.name || "Imported Workflow";
        const desc = json.description || "Imported from backup";
        const nodes = json.nodes || [];
        const edges = json.edges || [];

        // Seedha DB me naya workflow save kar do
        const res = await saveWorkflow(null, name, desc, nodes, edges);
        if (res.success) {
          router.refresh(); // Page ko refresh karo taaki naya flow dikh jaye
        } else {
          alert("Failed to import workflow. Please check the JSON format.");
        }
      } catch (err) {
        alert("Invalid JSON file!");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Input reset karo
      }
    };
    reader.readAsText(file);
  }

  return (
    <>
      <input 
        type="file" 
        accept=".json" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="rounded-full px-6 h-11 font-bold shadow-sm gap-2 border-border/50 hover:bg-muted/50"
      >
        {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} strokeWidth={2.5} />}
        {isImporting ? 'Importing...' : 'Import JSON'}
      </Button>
    </>
  )
}