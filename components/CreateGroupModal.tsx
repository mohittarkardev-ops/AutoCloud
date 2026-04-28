'use client'

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, MonitorSmartphone, Loader2 } from "lucide-react"
import { createDeviceGroup } from "@/app/actions/groups"

export function CreateGroupModal({ approvedNodes }: { approvedNodes: any[] }) {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const toggleDevice = (hardwareId: string) => {
    setSelectedDevices(prev => 
      prev.includes(hardwareId) 
        ? prev.filter(id => id !== hardwareId) 
        : [...prev, hardwareId]
    );
  };

  const handleSave = () => {
    if (!groupName || selectedDevices.length === 0) return;

    startTransition(async () => {
      await createDeviceGroup(groupName, description, selectedDevices);
      
      // Reset and close
      setGroupName("");
      setDescription("");
      setSelectedDevices([]);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus size={14} /> Create Group
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Device Group</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Group Name *</label>
            <Input 
              placeholder="e.g., Marketing Laptops" 
              value={groupName} 
              onChange={(e) => setGroupName(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Optional)</label>
            <Input 
              placeholder="What are these PCs used for?" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex justify-between">
              <span>Select Devices *</span>
              <span className="text-muted-foreground">{selectedDevices.length} selected</span>
            </label>
            
            <div className="border rounded-md">
              <ScrollArea className="h-[200px]">
                {approvedNodes.map(node => (
                  <div 
                    key={node.hardwareId} 
                    className="flex items-center space-x-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-0"
                    onClick={() => toggleDevice(node.hardwareId)}
                  >
                    <Checkbox 
                      checked={selectedDevices.includes(node.hardwareId)} 
                      onCheckedChange={() => toggleDevice(node.hardwareId)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-2">
                      <MonitorSmartphone size={14} className="text-muted-foreground" />
                      <span className="text-sm font-medium">{node.hostname}</span>
                      <span className="text-xs text-muted-foreground font-mono">({node.hardwareId})</span>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={!groupName || selectedDevices.length === 0 || isPending}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}