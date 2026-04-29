// web-dashboard/components/GroupsClient.tsx
'use client'

import { useTransition } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, MonitorSmartphone, Clock, Loader2, ServerCrash } from "lucide-react"
import { deleteGroup } from "@/app/actions/groups"

interface GroupsClientProps {
  initialGroups: any[];
  allDevices: any[];
}

export function GroupsClient({ initialGroups, allDevices }: GroupsClientProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (groupId: string, groupName: string) => {
    if (confirm(`Are you sure you want to delete the group "${groupName}"? All PCs inside will become unassigned.`)) {
      startTransition(async () => {
        await deleteGroup(groupId);
      });
    }
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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {initialGroups.map((group) => {
        // Find devices that belong to this specific group
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
              
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-8 px-3 gap-1.5 shadow-sm"
                onClick={() => handleDelete(group._id, group.name)}
                disabled={isPending}
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Group
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  )
}