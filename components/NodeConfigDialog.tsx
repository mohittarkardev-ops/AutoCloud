// web-dashboard/components/NodeConfigDialog.tsx
'use client'

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings2 } from "lucide-react"
import { updateNodeConfig } from "@/app/actions/nodes"

interface NodeConfigProps {
  hardwareId: string;
  currentAlias: string;
  currentMaxInstances: number;
}

export function NodeConfigDialog({ hardwareId, currentAlias, currentMaxInstances }: NodeConfigProps) {
  const [open, setOpen] = useState(false);
  const [alias, setAlias] = useState(currentAlias || "");
  const [instances, setInstances] = useState(currentMaxInstances || 1);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await updateNodeConfig(hardwareId, alias, instances);
      setOpen(false); // Update hone ke baad popup band kar do
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Node</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="alias">Custom Alias (Name)</Label>
            <Input 
              id="alias" 
              value={alias} 
              onChange={(e) => setAlias(e.target.value)} 
              placeholder="e.g. Sales-PC-1" 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="instances">Max Concurrent Instances</Label>
            <Input 
              id="instances" 
              type="number" 
              min={1}
              max={10}
              value={instances} 
              onChange={(e) => setInstances(parseInt(e.target.value) || 1)} 
            />
            <p className="text-xs text-muted-foreground">How many automation threads can run simultaneously on this PC.</p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}