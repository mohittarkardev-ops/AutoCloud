// web-dashboard/components/TaskBuilderClient.tsx
'use client'

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { assignTaskToNodes } from "@/app/actions/tasks"
import { Search, MonitorSmartphone, Send, CheckCircle2, Network, ExternalLink } from "lucide-react"
import Link from "next/link"

// Ab hum yahan `dbWorkflows` bhi receive kar rahe hain
export function TaskBuilderClient({ approvedNodes, dbWorkflows }: { approvedNodes: any[], dbWorkflows: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState(false);

  // Instant Search Logic
  const filteredNodes = approvedNodes.filter(node => {
    const term = searchTerm.toLowerCase();
    return (
      node.hostname.toLowerCase().includes(term) ||
      (node.alias && node.alias.toLowerCase().includes(term)) ||
      node.hardwareId.toLowerCase().includes(term)
    );
  });

  const toggleNode = (hardwareId: string) => {
    setSelectedNodes(prev => prev.includes(hardwareId) ? prev.filter(id => id !== hardwareId) : [...prev, hardwareId]);
  };

  const toggleAll = () => {
    if (selectedNodes.length === filteredNodes.length) {
      setSelectedNodes([]);
    } else {
      setSelectedNodes(filteredNodes.map(n => n.hardwareId));
    }
  };

  const handleDeploy = () => {
    if (selectedNodes.length === 0 || !selectedTask) return;
    
    // Asli task ka naam DB data se nikalna
    const taskName = dbWorkflows.find(w => w._id === selectedTask)?.name || "Unknown Task";

    startTransition(async () => {
      await assignTaskToNodes(selectedNodes, selectedTask, taskName);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
      setSelectedNodes([]);
      setSelectedTask("");
    });
  };

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      
      {/* LEFT PANEL: Target Nodes */}
      <div className="lg:col-span-3 flex flex-col border rounded-lg overflow-hidden bg-card">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Target Nodes</h3>
            <p className="text-xs text-muted-foreground">Select PCs to execute tasks.</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search PC name or MAC..." className="pl-8 h-9 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[50px] pl-4">
                  <Checkbox checked={filteredNodes.length > 0 && selectedNodes.length === filteredNodes.length} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead>Current Duty</TableHead>
                <TableHead>Hardware ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">No matching approved nodes found.</TableCell>
                </TableRow>
              ) : (
                filteredNodes.map(node => (
                  <TableRow key={node.hardwareId} className="cursor-pointer" onClick={() => toggleNode(node.hardwareId)}>
                    <TableCell className="pl-4">
                      <Checkbox checked={selectedNodes.includes(node.hardwareId)} onCheckedChange={() => toggleNode(node.hardwareId)} onClick={(e) => e.stopPropagation()} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MonitorSmartphone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm leading-none mb-1">{node.alias || node.hostname}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {node.assignedWorkflow ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">{node.assignedWorkflow.name}</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-md border">Idle (Unassigned)</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{node.hardwareId}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <div className="p-3 border-t bg-muted/20 text-xs text-muted-foreground font-medium">
          {selectedNodes.length} of {filteredNodes.length} nodes selected
        </div>
      </div>

      {/* RIGHT PANEL: Workflow Selection */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-semibold">Select Blueprint</h3>
             <Link href="/workflows/builder" className="text-xs text-primary hover:underline flex items-center gap-1">
                <ExternalLink size={12}/> Create New
             </Link>
          </div>
          
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid gap-3">
              {dbWorkflows.length === 0 ? (
                <div className="text-center p-8 border border-dashed rounded-lg bg-muted/10 text-muted-foreground">
                   <Network className="w-8 h-8 mx-auto mb-2 opacity-20" />
                   <p className="text-sm font-medium">No workflows found.</p>
                   <p className="text-xs mt-1">Design one in the Visual Builder first.</p>
                </div>
              ) : (
                dbWorkflows.map(wf => (
                  <Card 
                    key={wf._id} 
                    className={`cursor-pointer transition-all ${selectedTask === wf._id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:border-primary/50 shadow-none'}`}
                    onClick={() => setSelectedTask(wf._id)}
                  >
                    <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3 space-y-0">
                      <Network className={`w-5 h-5 ${selectedTask === wf._id ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="flex-1 overflow-hidden">
                        <CardTitle className="text-sm font-semibold truncate">{wf.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <CardDescription className="text-xs ml-8 line-clamp-2">{wf.description || "No description provided."}</CardDescription>
                      <div className="ml-8 mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-muted font-medium text-muted-foreground border">
                         {wf.nodesCount} Action Blocks
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Deploy Action Box */}
        <div className="mt-auto border rounded-lg p-6 bg-muted/20 flex flex-col justify-center text-center">
          {successMsg ? (
            <div className="flex flex-col items-center gap-2 text-green-600 animate-in fade-in zoom-in">
              <CheckCircle2 className="w-10 h-10" />
              <p className="font-bold">Blueprint Assigned!</p>
              <p className="text-xs text-muted-foreground">Wrappers will start execution shortly.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedNodes.length === 0 
                  ? "Select at least one node to deploy." 
                  : !selectedTask 
                    ? `Ready to deploy to ${selectedNodes.length} node(s). Select a workflow.`
                    : `Deploying "${dbWorkflows.find(w => w._id === selectedTask)?.name}" to ${selectedNodes.length} PC(s).`}
              </p>
              <Button size="lg" onClick={handleDeploy} disabled={selectedNodes.length === 0 || !selectedTask || isPending} className="w-full gap-2">
                {isPending ? "Assigning Tasks..." : <><Send className="w-4 h-4" /> Deploy to {selectedNodes.length} PCs</>}
              </Button>
            </>
          )}
        </div>
      </div>

    </div>
  )
}