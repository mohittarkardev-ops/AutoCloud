'use client'

import { useState, useTransition } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2, MonitorSmartphone, Clock, Loader2, ServerCrash, Settings2 } from "lucide-react"
import { deleteGroup, updateGroupDevices } from "@/app/actions/groups" // 🔴 NAYA IMPORT

interface GroupsClientProps {
  initialGroups: any[];
  allDevices: any[]; // 🔴 Now contains ALL approved devices
}

export function GroupsClient({ initialGroups, allDevices }: GroupsClientProps) {
  const [isPending, startTransition] = useTransition();
  
  // Manage PCs Modal States
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [currentEditingGroup, setCurrentEditingGroup] = useState<any>(null);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  // 🗑️ Delete Group Logic
  const handleDelete = (groupId: string, groupName: string) => {
    if (confirm(`Are you sure you want to delete the group "${groupName}"? All PCs inside will become unassigned.`)) {
      startTransition(async () => {
        await deleteGroup(groupId);
      });
    }
  };

  // ⚙️ Open Manage Modal
  const openManageModal = (group: any) => {
    setCurrentEditingGroup(group);
    // 🔴 पहले से जो PC इस ग्रुप में हैं, उन्हें टिक (Check) कर दें
    const existingDeviceIds = allDevices.filter(d => d.groupId === group._id).map(d => d.hardwareId);
    setSelectedDevices(existingDeviceIds);
    setManageModalOpen(true);
  };

  // ✅ Toggle Device Selection
  const toggleDevice = (hardwareId: string) => {
    setSelectedDevices(prev => 
      prev.includes(hardwareId) ? prev.filter(id => id !== hardwareId) : [...prev, hardwareId]
    );
  };

  // 💾 Save Managed Devices
  const handleSaveDevices = () => {
    if (!currentEditingGroup) return;
    
    startTransition(async () => {
      await updateGroupDevices(currentEditingGroup._id, currentEditingGroup.name, selectedDevices);
      setManageModalOpen(false);
      setCurrentEditingGroup(null);
    });
  };

  if (initialGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl bg-card/30">
        <div className="p-5 bg-muted/50 rounded-full mb-4">
          <ServerCrash size={48} className="opacity-40" />
        </div>
        <h3 className="text-xl font-bold text-foreground">No Groups Found</h3>
        <p className="text-sm mt-2">You haven't created any device groups yet. Go to the Hardware Nodes page to create one.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {initialGroups.map((group) => {
          const groupDevices = allDevices.filter(d => d.groupId === group._id);
          
          return (
            <Card key={group._id} className="flex flex-col shadow-sm hover:shadow-md transition-shadow border-border/60">
              <CardHeader className="pb-3 border-b border-border/30 bg-muted/10">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-bold text-primary">{group.name}</CardTitle>
                    <CardDescription className="mt-1.5 text-xs font-medium">
                      {group.description || "No description provided."}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                    {groupDevices.length} PCs
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 pt-4">
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Nodes</p>
                  {groupDevices.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {groupDevices.map(device => (
                        <div key={device._id} className="flex items-center gap-1.5 bg-muted/50 border border-border/50 px-2 py-1 rounded-md text-xs font-medium">
                          <MonitorSmartphone size={12} className="text-muted-foreground" />
                          {device.alias || device.hostname}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic bg-muted/30 p-2 rounded-md">No devices currently in this group.</p>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between items-center pt-4 border-t border-border/30 bg-muted/5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Clock size={14} />
                  {new Date(group.createdAt).toLocaleDateString()}
                </div>
                
                <div className="flex gap-2">
                  {/* 🔴 NAYA: Manage PCs Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-3 gap-1.5 shadow-sm"
                    onClick={() => openManageModal(group)}
                    disabled={isPending}
                  >
                    <Settings2 size={14} />
                    Manage PCs
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(group._id, group.name)}
                    disabled={isPending}
                    title="Delete Group"
                  >
                    {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* 🔴 NAYA: Manage PCs Dialog / Modal */}
      <Dialog open={manageModalOpen} onOpenChange={setManageModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Manage PCs in {currentEditingGroup?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Select or deselect PCs to update this group.
            </p>
            <div className="border rounded-md bg-card">
              <ScrollArea className="h-[250px]">
                {allDevices.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No approved PCs available.</div>
                ) : (
                  allDevices.map(node => {
                    // Check if node is assigned to ANOTHER group
                    const isAssignedElsewhere = node.groupId && node.groupId !== currentEditingGroup?._id;

                    return (
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
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center gap-2">
                            <MonitorSmartphone size={14} className="text-muted-foreground" />
                            <span className="text-sm font-medium">{node.alias || node.hostname}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{node.hardwareId}</span>
                        </div>

                        {/* Show badge if it belongs to another group */}
                        {isAssignedElsewhere && (
                          <Badge variant="outline" className="text-[10px] bg-muted">
                            {node.groupName}
                          </Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </ScrollArea>
            </div>
            <div className="mt-3 text-xs font-bold text-muted-foreground">
              {selectedDevices.length} PCs selected
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageModalOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSaveDevices} disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}