// web-dashboard/components/NodesTableClient.tsx
'use client'

import { useState, useTransition, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  MonitorSmartphone, Ban, Layers, Wifi, WifiOff, 
  Search, ArrowUpDown, ArrowUp, ArrowDown, X, Trash2, Loader2,
  ChevronLeft, ChevronRight, Activity, CheckCircle2, AlertCircle, Users
} from "lucide-react"
import Link from "next/link"
import { NodeActionButtons } from "@/components/NodeActionButtons"
import { NodeConfigDialog } from "@/components/NodeConfigDialog"
import { DeleteNodeButton } from "@/components/DeleteNodeButton" 
import { removeDeviceFromGroup, updateGroupDevices } from "@/app/actions/groups"
import { updateNodeStatus, deleteNode } from "@/app/actions/nodes"

type SortKey = 'identity' | 'mac' | 'status' | 'ports' | 'groups' | 'assignment' | 'sync';
type SortDirection = 'asc' | 'desc';

interface NodesTableClientProps {
  initialDevices: any[];
  deviceGroups?: any[]; 
}

export function NodesTableClient({ initialDevices, deviceGroups = [] }: NodesTableClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [groupFilter, setGroupFilter] = useState("ALL") 
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
  
  // Pagination & Selection State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // compact: whole page fits one screen (raise if you prefer longer pages)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [isPending, startTransition] = useTransition();

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, groupFilter]);

  const getDeviceGroupsList = (hardwareId: string) => {
    return deviceGroups.filter(g => g.deviceIds?.includes(hardwareId) || g._id === initialDevices.find(d => d.hardwareId === hardwareId)?.groupId);
  };

  // 1. FILTERING
  const filteredDevices = initialDevices.filter((device) => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = 
      (device.alias || "").toLowerCase().includes(searchString) ||
      (device.hostname || "").toLowerCase().includes(searchString) ||
      (device.hardwareId || "").toLowerCase().includes(searchString);

    const matchesStatus = statusFilter === "ALL" || device.status === statusFilter.toLowerCase();
    
    const deviceGroupsArray = getDeviceGroupsList(device.hardwareId);
    const matchesGroup = 
      groupFilter === "ALL" ? true :
      groupFilter === "UNASSIGNED" ? deviceGroupsArray.length === 0 :
      deviceGroupsArray.some(g => g._id === groupFilter);

    return matchesSearch && matchesStatus && matchesGroup;
  });

  // 2. SORTING
  const sortedDevices = [...filteredDevices].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let valA: any = ''; let valB: any = '';

    switch (key) {
      case 'identity': valA = (a.alias || a.hostname || '').toLowerCase(); valB = (b.alias || b.hostname || '').toLowerCase(); break;
      case 'mac': valA = (a.hardwareId || '').toLowerCase(); valB = (b.hardwareId || '').toLowerCase(); break;
      case 'status': valA = (a.status || '').toLowerCase(); valB = (b.status || '').toLowerCase(); break;
      case 'ports': valA = a.maxInstances || 1; valB = b.maxInstances || 1; break;
      case 'groups': valA = getDeviceGroupsList(a.hardwareId).map(g => g.name).join(', ').toLowerCase(); valB = getDeviceGroupsList(b.hardwareId).map(g => g.name).join(', ').toLowerCase(); break;
      case 'assignment': valA = (a.assignedWorkflow?.name || '').toLowerCase(); valB = (b.assignedWorkflow?.name || '').toLowerCase(); break;
      case 'sync': valA = new Date(a.lastSeen).getTime(); valB = new Date(b.lastSeen).getTime(); break;
    }
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedDevices.length / itemsPerPage);
  const paginatedDevices = sortedDevices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 3. HEALTH METRICS CALCULATION
  const now = new Date().getTime();
  const liveCount = initialDevices.filter(d => (now - new Date(d.lastSeen).getTime()) < 90000).length;
  const pendingCount = initialDevices.filter(d => d.status === 'pending').length;
  const blockedCount = initialDevices.filter(d => d.status === 'blocked').length;

  // 4. BULK ACTIONS & SELECTION
  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(paginatedDevices.map(d => d.hardwareId));
    else setSelectedIds([]);
  };

  const handleSelectOne = (checked: boolean, id: string) => {
    if (checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(item => item !== id));
  };

  const handleBulkAction = (action: 'approve' | 'block' | 'delete') => {
    if (!confirm(`Are you sure you want to ${action} ${selectedIds.length} selected PCs?`)) return;
    
    startTransition(async () => {
      const promises = selectedIds.map(id => {
        if (action === 'delete') return deleteNode(id);
        return updateNodeStatus(id, action === 'approve' ? 'approved' : 'blocked');
      });
      await Promise.all(promises);
      setSelectedIds([]); // Clear selection after action
    });
  };

  const handleBulkGroupAssign = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetGroupId = e.target.value;
    if (!targetGroupId) return;

    const targetGroup = deviceGroups.find(g => g._id === targetGroupId);
    if (!targetGroup) return;

    if (!confirm(`Assign ${selectedIds.length} PCs to "${targetGroup.name}"?`)) {
      e.target.value = ""; // reset select
      return;
    }

    startTransition(async () => {
      // Pass the selected IDs to the backend group updater.
      // We pass the IDs of the currently selected PCs to replace or append to the group.
      await updateGroupDevices(targetGroup._id, targetGroup.name, selectedIds);
      setSelectedIds([]);
      e.target.value = "";
    });
  };

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const SortableHeader = ({ label, sortKey }: { label: string, sortKey: SortKey }) => (
    <TableHead 
      className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground hover:bg-accent/60 transition-colors select-none"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {sortConfig?.key === sortKey ? (
          sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-primary" /> : <ArrowDown size={13} className="text-primary" />
        ) : <ArrowUpDown size={13} className="opacity-30" />}
      </div>
    </TableHead>
  );

  // 5. FLOATING BAR STATE CALCULATIONS
  const selectedDevices = initialDevices.filter(d => selectedIds.includes(d.hardwareId));
  const canApprove = selectedDevices.some(d => d.status !== 'approved');
  const canBlock = selectedDevices.some(d => d.status !== 'blocked');

  return (
    <div className="space-y-4 relative pb-20">
      
      {/* 🚀 UPGRADE 1: HEALTH CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="py-0 border-none">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-full"><MonitorSmartphone size={20} /></div>
            <div><p className="text-2xl font-bold">{initialDevices.length}</p><p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Nodes</p></div>
          </CardContent>
        </Card>
        <Card className="py-0 border-none">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-full"><Activity size={20} /></div>
            <div><p className="text-2xl font-bold">{liveCount}</p><p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Live Now</p></div>
          </CardContent>
        </Card>
        <Card className="py-0 border-none">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-full"><AlertCircle size={20} /></div>
            <div><p className="text-2xl font-bold">{pendingCount}</p><p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Pending Approval</p></div>
          </CardContent>
        </Card>
        <Card className="py-0 border-none">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 text-red-500 rounded-full"><Ban size={20} /></div>
            <div><p className="text-2xl font-bold">{blockedCount}</p><p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Blocked</p></div>
          </CardContent>
        </Card>
      </div>

      {/* 🎛️ UPGRADE 2: TOGGLE TABS & CONTROLS */}
      <div className="flex flex-col xl:flex-row gap-3 items-center justify-between bg-card p-2.5 rounded-2xl">
        
        {/* Status Toggle Tabs */}
        <div className="flex bg-muted p-1 rounded-full w-full xl:w-auto">
          {['ALL', 'APPROVED', 'PENDING', 'BLOCKED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 xl:flex-none px-4 py-1.5 text-xs font-medium rounded-full transition-all ${statusFilter === status ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search identity or MAC..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-muted/60 border border-transparent rounded-full outline-none focus:border-primary transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Layers size={14} className="text-muted-foreground hidden sm:block" />
            <select 
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 text-sm bg-muted/60 border border-transparent rounded-full outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">All Groups</option>
              <option value="UNASSIGNED">Unassigned PCs</option>
              {deviceGroups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 📊 DATA TABLE */}
      <Card className="py-0 border-none overflow-hidden">
        <div className="w-full">
          <Table className="[&_td]:px-2.5 [&_td]:py-2 [&_th]:px-2.5 [&_th]:h-10">
            <TableHeader className="bg-transparent hover:bg-transparent">
              <TableRow className="border-b border-border/60">
                <TableHead className="w-10 pl-4">
                  <Checkbox 
                    checked={paginatedDevices.length > 0 && selectedIds.length === paginatedDevices.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <SortableHeader label="Identity" sortKey="identity" />
                <SortableHeader label="MAC ID" sortKey="mac" />
                <SortableHeader label="Status" sortKey="status" />
                <SortableHeader label="Max Ports" sortKey="ports" />
                <SortableHeader label="Groups" sortKey="groups" />
                <SortableHeader label="Assignment" sortKey="assignment" />
                <SortableHeader label="Last Sync" sortKey="sync" />
                <TableHead className="text-right pr-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Access Mgt.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDevices.length === 0 ? ( 
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-24 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-muted/30 rounded-full">
                        <MonitorSmartphone size={40} className="opacity-20" />
                      </div>
                      <p className="font-bold text-lg">No endpoints found</p>
                      <p className="text-sm">Try adjusting your search or filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDevices.map((device) => { 
                  const lastSeenDate = new Date(device.lastSeen).getTime();
                  const isOnline = (now - lastSeenDate) < 90000; 
                  const deviceGroupsArray = getDeviceGroupsList(device.hardwareId);
                  const isSelected = selectedIds.includes(device.hardwareId);

                  return (
                    <TableRow key={device._id} className={`${isSelected ? 'bg-accent' : ''} transition-colors ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
                      <TableCell className="pl-4">
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={(c) => handleSelectOne(c as boolean, device.hardwareId)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{device.alias || device.hostname}</span>
                          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{device.hostname}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span title={device.hardwareId} className="inline-block max-w-[120px] truncate align-middle font-mono text-[11px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full uppercase">{device.hardwareId}</span>
                      </TableCell>
                      <TableCell>
                        {device.status === 'blocked' ? (
                          <Badge variant="destructive" className="gap-1 px-2.5 py-0.5 shadow-sm"><Ban size={12} /> Blocked</Badge>
                        ) : isOnline ? (
                          <Badge variant="success" className="gap-1.5 px-2.5 py-0.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border gap-1.5 px-2.5 py-0.5"><WifiOff size={12} /> Offline</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 bg-background border px-2 py-1 rounded-lg w-fit shadow-sm">
                          <span className="text-sm font-black">{device.maxInstances || 1}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {deviceGroupsArray.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {deviceGroupsArray.slice(0, 2).map((g) => (
                              <Badge key={g._id} variant="secondary" className="text-[11px] pr-1 pl-2 py-0.5 bg-brand-50 text-brand-700 border-brand-100 hover:bg-brand-100 flex items-center gap-1.5">
                                {g.name}
                                <div className="cursor-pointer hover:bg-red-100 hover:text-red-600 rounded-full p-0.5 transition-colors"
                                  onClick={(e) => { e.preventDefault(); startTransition(() => { removeDeviceFromGroup(device.hardwareId); }); }} title="Remove from group">
                                  <X size={12} />
                                </div>
                              </Badge>
                            ))}
                            {deviceGroupsArray.length > 2 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{deviceGroupsArray.length - 2}</Badge>}
                          </div>
                        ) : <span className="text-[11px] font-medium text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">Unassigned</span>}
                      </TableCell>
                      <TableCell>
                        {device.assignedWorkflow ? (
                          <div className="flex flex-col max-w-[150px]">
                            <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-md truncate" title={device.assignedWorkflow.name}>
                              {device.assignedWorkflow.name}
                            </span>
                          </div>
                        ) : <span className="text-[11px] font-medium text-muted-foreground italic px-2 py-1 bg-muted/30 rounded-md">Standby</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold">{new Date(device.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">Today</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-3">
                        <div className="flex justify-end items-center gap-1.5">
                          {device.status === 'approved' && (
                            <Link href={`/nodes/${device.hardwareId}`}>
                              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-primary text-[11px] font-medium">
                                <Layers size={13} /> Details
                              </Button>
                            </Link>
                          )}
                          <NodeConfigDialog hardwareId={device.hardwareId} currentAlias={device.alias || ""} currentMaxInstances={device.maxInstances || 1} />
                          <NodeActionButtons hardwareId={device.hardwareId} currentStatus={device.status} />
                          <div className="w-px h-4 bg-border mx-1"></div>
                          <DeleteNodeButton hardwareId={device.hardwareId} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-border/50">
            <span className="text-xs text-muted-foreground font-medium">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedDevices.length)} of {sortedDevices.length} PCs
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 px-2"><ChevronLeft size={16} /></Button>
              <span className="text-xs font-bold px-2">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 px-2"><ChevronRight size={16} /></Button>
            </div>
          </div>
        )}
      </Card>

      {/* 🚀 UPGRADE 3: FLOATING BULK ACTION BAR (STATE-AWARE) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <Card className="bg-brand-950 text-white border-brand-700 shadow-2xl p-2 rounded-full flex items-center gap-4 pl-5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold">
                {selectedIds.length}
              </span>
              <span className="text-sm font-semibold">Selected</span>
            </div>
            
            <div className="h-6 w-px bg-zinc-700 mx-1"></div>
            
            <div className="flex items-center gap-2">
              {/* Group Assignment Dropdown */}
              <div className="relative flex items-center bg-zinc-800 border border-zinc-700 rounded-lg px-2 h-9 overflow-hidden">
                <Users size={14} className="text-zinc-400 mr-2" />
                <select 
                  className="bg-transparent text-sm text-zinc-100 outline-none w-32 cursor-pointer appearance-none"
                  onChange={handleBulkGroupAssign}
                  defaultValue=""
                  disabled={isPending}
                >
                  <option value="" disabled className="text-zinc-900">Assign Group...</option>
                  {deviceGroups.map(g => (
                    <option key={g._id} value={g._id} className="text-zinc-900">{g.name}</option>
                  ))}
                </select>
              </div>

              {canApprove && (
                <Button size="sm" variant="ghost" className="hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300" onClick={() => handleBulkAction('approve')} disabled={isPending}>
                  <CheckCircle2 size={16} className="mr-2" /> Approve All
                </Button>
              )}
              {canBlock && (
                <Button size="sm" variant="ghost" className="hover:bg-zinc-800 text-amber-400 hover:text-amber-300" onClick={() => handleBulkAction('block')} disabled={isPending}>
                  <Ban size={16} className="mr-2" /> Block All
                </Button>
              )}
              
              <div className="h-4 w-px bg-zinc-700 mx-1"></div>
              
              <Button size="sm" variant="ghost" className="hover:bg-red-950/50 text-red-400 hover:text-red-300" onClick={() => handleBulkAction('delete')} disabled={isPending}>
                <Trash2 size={16} className="mr-2" /> Delete All
              </Button>
            </div>

            <Button size="icon" variant="ghost" className="rounded-full hover:bg-zinc-800 ml-2" onClick={() => setSelectedIds([])}>
              <X size={16} className="text-zinc-400" />
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}