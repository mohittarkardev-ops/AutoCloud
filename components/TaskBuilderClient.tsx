'use client'

import { useState, useTransition, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { assignTaskToNodes } from "@/app/actions/tasks"
import { Search, MonitorSmartphone, Send, CheckCircle2, Network, ExternalLink, Layers, Users, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

interface TaskBuilderClientProps {
  approvedNodes: any[];
  dbWorkflows: any[];
  deviceGroups?: any[]; 
}

export function TaskBuilderClient({ approvedNodes, dbWorkflows, deviceGroups = [] }: TaskBuilderClientProps) {
  const [activeTab, setActiveTab] = useState<'nodes' | 'groups'>('nodes');
  const [searchTerm, setSearchTerm] = useState("");
  
  // Selection States
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>("");
  
  // 🔴 NAYA: Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState(false);

  // Reset page when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  // --- FILTER LOGIC ---
  const filteredNodes = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return approvedNodes.filter(node => 
      node.hostname.toLowerCase().includes(term) ||
      (node.alias && node.alias.toLowerCase().includes(term)) ||
      node.hardwareId.toLowerCase().includes(term)
    );
  }, [approvedNodes, searchTerm]);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return deviceGroups.filter(group => 
      group.name?.toLowerCase().includes(term) ||
      group.description?.toLowerCase().includes(term)
    );
  }, [deviceGroups, searchTerm]);

  // 🔴 NAYA: Pagination Calculations
  const totalPages = Math.ceil(filteredNodes.length / itemsPerPage);
  const paginatedNodes = filteredNodes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- TOGGLE LOGIC (NODES) ---
  const toggleNode = (hardwareId: string) => {
    setSelectedNodes(prev => prev.includes(hardwareId) ? prev.filter(id => id !== hardwareId) : [...prev, hardwareId]);
  };

  // 🔴 FIX: Robust Bulk Selection (Works perfectly with search & pagination)
  const isAllFilteredSelected = filteredNodes.length > 0 && filteredNodes.every(n => selectedNodes.includes(n.hardwareId));
  
  const toggleAllNodes = () => {
    if (isAllFilteredSelected) {
      // Remove all current filtered items from selection
      const filteredIds = filteredNodes.map(n => n.hardwareId);
      setSelectedNodes(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Add all current filtered items to selection
      const filteredIds = filteredNodes.map(n => n.hardwareId);
      setSelectedNodes(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // --- TOGGLE LOGIC (GROUPS) ---
  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };

  const isAllGroupsSelected = filteredGroups.length > 0 && filteredGroups.every(g => selectedGroups.includes(g._id));

  const toggleAllGroups = () => {
    if (isAllGroupsSelected) {
      const filteredIds = filteredGroups.map(g => g._id);
      setSelectedGroups(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const filteredIds = filteredGroups.map(g => g._id);
      setSelectedGroups(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const getTotalDevicesFromGroups = () => {
    const idsSet = new Set<string>();
    selectedGroups.forEach(groupId => {
      approvedNodes.filter(n => n.groupId === groupId).forEach(n => idsSet.add(n.hardwareId));
    });
    return idsSet.size;
  };

  // --- DEPLOYMENT LOGIC ---
  const handleDeploy = () => {
    if (!selectedTask) return;
    if (activeTab === 'nodes' && selectedNodes.length === 0) return;
    if (activeTab === 'groups' && selectedGroups.length === 0) return;
    
    const taskName = dbWorkflows.find(w => w._id === selectedTask)?.name || "Unknown Task";
    let targetHardwareIds: string[] = [];

    if (activeTab === 'nodes') {
      targetHardwareIds = selectedNodes;
    } else {
      const idsSet = new Set<string>();
      selectedGroups.forEach(groupId => {
        approvedNodes
          .filter(node => node.groupId === groupId)
          .forEach(node => idsSet.add(node.hardwareId));
      });
      targetHardwareIds = Array.from(idsSet);
    }

    if (targetHardwareIds.length === 0) {
      alert("No valid/approved devices found in the selected targets.");
      return;
    }

    startTransition(async () => {
      await assignTaskToNodes(targetHardwareIds, selectedTask, taskName);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
      
      setSelectedNodes([]);
      setSelectedGroups([]);
      setSelectedTask("");
    });
  };

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      
      {/* LEFT PANEL: Target Selection */}
      <div className="lg:col-span-3 flex flex-col border rounded-lg overflow-hidden bg-card shadow-sm">
        <div className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Target Assignments</h3>
            <p className="text-xs text-muted-foreground">Select individual PCs or Device Groups.</p>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex p-1 bg-muted/50 border rounded-md">
              <button 
                onClick={() => setActiveTab('nodes')}
                className={`flex items-center justify-center gap-1.5 flex-1 text-xs font-medium py-1.5 px-3 rounded-sm transition-all ${activeTab === 'nodes' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <MonitorSmartphone size={14}/> Nodes
              </button>
              <button 
                onClick={() => setActiveTab('groups')}
                className={`flex items-center justify-center gap-1.5 flex-1 text-xs font-medium py-1.5 px-3 rounded-sm transition-all ${activeTab === 'groups' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Layers size={14}/> Groups
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={activeTab === 'nodes' ? "Search PC name or MAC..." : "Search group name..."} 
                className="pl-8 h-9 text-sm bg-background" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[50px] pl-4">
                  {activeTab === 'nodes' ? (
                    <Checkbox checked={isAllFilteredSelected} onCheckedChange={toggleAllNodes} />
                  ) : (
                    <Checkbox checked={isAllGroupsSelected} onCheckedChange={toggleAllGroups} />
                  )}
                </TableHead>
                <TableHead>{activeTab === 'nodes' ? 'Hostname' : 'Group Name'}</TableHead>
                <TableHead>{activeTab === 'nodes' ? 'Current Duty' : 'Total Devices'}</TableHead>
                <TableHead>{activeTab === 'nodes' ? 'Hardware ID' : 'Description'}</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {/* --- NODES VIEW --- */}
              {activeTab === 'nodes' && (
                paginatedNodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">No matching approved nodes found.</TableCell>
                  </TableRow>
                ) : (
                  paginatedNodes.map(node => (
                    <TableRow key={node.hardwareId} className="cursor-pointer hover:bg-muted/30" onClick={() => toggleNode(node.hardwareId)}>
                      <TableCell className="pl-4">
                        <Checkbox checked={selectedNodes.includes(node.hardwareId)} onCheckedChange={() => toggleNode(node.hardwareId)} onClick={(e) => e.stopPropagation()} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MonitorSmartphone className="w-4 h-4 text-muted-foreground" />
                          <p className="font-medium text-sm leading-none">{node.alias || node.hostname}</p>
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
                )
              )}

              {/* --- GROUPS VIEW --- */}
              {activeTab === 'groups' && (
                filteredGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">No groups found. Create one in your database first.</TableCell>
                  </TableRow>
                ) : (
                  filteredGroups.map(group => {
                    const groupDeviceCount = approvedNodes.filter(n => n.groupId === group._id).length;
                    return (
                      <TableRow key={group._id} className="cursor-pointer hover:bg-muted/30" onClick={() => toggleGroup(group._id)}>
                        <TableCell className="pl-4">
                          <Checkbox checked={selectedGroups.includes(group._id)} onCheckedChange={() => toggleGroup(group._id)} onClick={(e) => e.stopPropagation()} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-500" />
                            <p className="font-medium text-sm leading-none">{group.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <Users size={14} className="text-muted-foreground"/>
                            {groupDeviceCount} PCs
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {group.description || "No description"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        
        {/* 🔴 NAYA: Pagination Controls for Nodes */}
        {activeTab === 'nodes' && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted/10 border-t border-border/50">
            <span className="text-[11px] text-muted-foreground font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-6 px-2">
                <ChevronLeft size={14} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-6 px-2">
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        <div className="p-3 border-t bg-muted/20 text-xs text-muted-foreground font-medium flex justify-between items-center">
          <span>
            {activeTab === 'nodes' 
              ? `${selectedNodes.length} of ${filteredNodes.length} filtered nodes selected` 
              : `${selectedGroups.length} of ${filteredGroups.length} filtered groups selected`}
          </span>
          {activeTab === 'groups' && selectedGroups.length > 0 && (
            <span className="text-primary font-bold">{getTotalDevicesFromGroups()} Unique PCs Total</span>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Workflow Selection & Deploy */}
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
                      <div className="ml-8 mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-background font-medium text-muted-foreground border">
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
        <div className="mt-auto border rounded-lg p-6 bg-muted/10 flex flex-col justify-center text-center shadow-sm">
          {successMsg ? (
            <div className="flex flex-col items-center gap-2 text-green-600 animate-in fade-in zoom-in">
              <CheckCircle2 className="w-10 h-10" />
              <p className="font-bold">Tasks Assigned Successfully!</p>
              <p className="text-xs text-muted-foreground">Wrappers will begin execution shortly.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {(activeTab === 'nodes' && selectedNodes.length === 0) || (activeTab === 'groups' && selectedGroups.length === 0)
                  ? `Select at least one ${activeTab === 'nodes' ? 'node' : 'group'} to deploy.` 
                  : !selectedTask 
                    ? `Ready. Select a workflow to deploy to ${activeTab === 'nodes' ? selectedNodes.length + ' node(s)' : selectedGroups.length + ' group(s)'}.`
                    : `Deploying "${dbWorkflows.find(w => w._id === selectedTask)?.name}" to ${
                        activeTab === 'nodes' ? selectedNodes.length + ' PC(s)' : getTotalDevicesFromGroups() + ' total PC(s)'
                      }.`}
              </p>
              <Button 
                size="lg" 
                onClick={handleDeploy} 
                disabled={
                  (activeTab === 'nodes' && selectedNodes.length === 0) || 
                  (activeTab === 'groups' && selectedGroups.length === 0) || 
                  !selectedTask || 
                  isPending
                } 
                className="w-full gap-2 shadow-sm"
              >
                {isPending ? "Assigning Tasks..." : (
                  <>
                    <Send className="w-4 h-4" /> 
                    Deploy to {activeTab === 'nodes' ? selectedNodes.length + ' PCs' : getTotalDevicesFromGroups() + ' PCs'}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

    </div>
  )
}