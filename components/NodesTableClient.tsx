'use client'

import { useState, useTransition } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  MonitorSmartphone, Ban, Layers, Wifi, WifiOff, 
  Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, X, Trash2, Loader2 
} from "lucide-react"
import Link from "next/link"
import { NodeActionButtons } from "@/components/NodeActionButtons"
import { NodeConfigDialog } from "@/components/NodeConfigDialog"
import { DeleteNodeButton } from "@/components/DeleteNodeButton" 

// 🔴 NEW IMPORTS: Server actions for group management
import { removeDeviceFromGroup, deleteGroup } from "@/app/actions/groups"

type SortKey = 'identity' | 'mac' | 'status' | 'ports' | 'groups' | 'assignment' | 'sync';
type SortDirection = 'asc' | 'desc';

interface NodesTableClientProps {
  initialDevices: any[];
  deviceGroups?: any[]; 
}

export function NodesTableClient({ initialDevices, deviceGroups = [] }: NodesTableClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [groupFilter, setGroupFilter] = useState("ALL") // 🔴 NAYA: Group Filter State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
  
  const [isPending, startTransition] = useTransition();

  // Helper to get groups for a specific device
  const getDeviceGroupsList = (hardwareId: string) => {
    // Falls back to checking both deviceIds array or groupId string matching
    return deviceGroups.filter(g => g.deviceIds?.includes(hardwareId) || g._id === initialDevices.find(d => d.hardwareId === hardwareId)?.groupId);
  };

  // 🔴 Server Action Handlers
  const handleRemoveFromGroup = (hardwareId: string) => {
    if (confirm("Are you sure you want to remove this PC from its group?")) {
      startTransition(async () => {
        await removeDeviceFromGroup(hardwareId);
      });
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm("Are you sure you want to delete this group? All PCs inside will become unassigned.")) {
      startTransition(async () => {
        await deleteGroup(groupId);
        setGroupFilter("ALL"); // Reset filter after deletion
      });
    }
  };

  // 1. FILTERING LOGIC
  const filteredDevices = initialDevices.filter((device) => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = 
      (device.alias || "").toLowerCase().includes(searchString) ||
      (device.hostname || "").toLowerCase().includes(searchString) ||
      (device.hardwareId || "").toLowerCase().includes(searchString);

    const matchesStatus = statusFilter === "ALL" || device.status === statusFilter.toLowerCase();
    
    // 🔴 NAYA: Group Filter Logic
    const deviceGroupsArray = getDeviceGroupsList(device.hardwareId);
    const matchesGroup = 
      groupFilter === "ALL" ? true :
      groupFilter === "UNASSIGNED" ? deviceGroupsArray.length === 0 :
      deviceGroupsArray.some(g => g._id === groupFilter);

    return matchesSearch && matchesStatus && matchesGroup;
  });

  // 2. SORTING LOGIC
  const sortedDevices = [...filteredDevices].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;
    let valA: any = '';
    let valB: any = '';

    switch (key) {
      case 'identity':
        valA = (a.alias || a.hostname || '').toLowerCase();
        valB = (b.alias || b.hostname || '').toLowerCase();
        break;
      case 'mac':
        valA = (a.hardwareId || '').toLowerCase();
        valB = (b.hardwareId || '').toLowerCase();
        break;
      case 'status':
        valA = (a.status || '').toLowerCase();
        valB = (b.status || '').toLowerCase();
        break;
      case 'ports':
        valA = a.maxInstances || 1;
        valB = b.maxInstances || 1;
        break;
      case 'groups':
        valA = getDeviceGroupsList(a.hardwareId).map(g => g.name).join(', ').toLowerCase();
        valB = getDeviceGroupsList(b.hardwareId).map(g => g.name).join(', ').toLowerCase();
        break;
      case 'assignment':
        valA = (a.assignedWorkflow?.name || '').toLowerCase();
        valB = (b.assignedWorkflow?.name || '').toLowerCase();
        break;
      case 'sync':
        valA = new Date(a.lastSeen).getTime();
        valB = new Date(b.lastSeen).getTime();
        break;
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader = ({ label, sortKey }: { label: string, sortKey: SortKey }) => {
    return (
      <TableHead 
        className="font-bold text-xs uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground hover:bg-muted/40 transition-colors select-none"
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center gap-1.5">
          {label}
          {sortConfig?.key === sortKey ? (
            sortConfig.direction === 'asc' ? <ArrowUp size={13} className="text-primary" /> : <ArrowDown size={13} className="text-primary" />
          ) : (
            <ArrowUpDown size={13} className="opacity-30" />
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* 🎛️ CONTROL BAR: Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between bg-card/60 p-3 rounded-xl border border-border/50 shadow-sm">
        <div className="relative w-full lg:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search by Identity or MAC ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors shadow-sm"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-muted-foreground hidden sm:block" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary cursor-pointer shadow-sm"
            >
              <option value="ALL">All Status</option>
              <option value="APPROVED">Approved (Active)</option>
              <option value="PENDING">Pending (Awaiting)</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>

          {/* 🔴 NAYA: Group Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Layers size={16} className="text-muted-foreground hidden sm:block" />
            <select 
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-primary cursor-pointer shadow-sm"
            >
              <option value="ALL">All Groups</option>
              <option value="UNASSIGNED">Unassigned PCs</option>
              {deviceGroups.map(g => (
                <option key={g._id} value={g._id}>{g.name}</option>
              ))}
            </select>

            {/* 🔴 NAYA: Delete Group Button (Appears only when a specific group is selected) */}
            {groupFilter !== "ALL" && groupFilter !== "UNASSIGNED" && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-9 px-3 gap-1.5 shadow-sm"
                onClick={() => handleDeleteGroup(groupFilter)}
                disabled={isPending}
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span className="hidden sm:inline">Delete</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 📊 DATA TABLE */}
      <Card className="border-none shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30 hover:bg-muted/30">
              <TableRow className="border-b border-border/50">
                <SortableHeader label="Identity" sortKey="identity" />
                <SortableHeader label="MAC ID" sortKey="mac" />
                <SortableHeader label="Status" sortKey="status" />
                <SortableHeader label="Max Ports" sortKey="ports" />
                <SortableHeader label="Groups" sortKey="groups" />
                <SortableHeader label="Assignment" sortKey="assignment" />
                <SortableHeader label="Last Sync" sortKey="sync" />
                <TableHead className="text-right pr-6 font-bold text-xs uppercase tracking-widest text-muted-foreground">Access Mgt.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              
              {sortedDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-24 text-muted-foreground">
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
                sortedDevices.map((device) => {
                  const lastSeenDate = new Date(device.lastSeen).getTime();
                  const now = new Date().getTime();
                  const isOnline = (now - lastSeenDate) < 90000; 
                  
                  const deviceGroupsArray = getDeviceGroupsList(device.hardwareId);

                  return (
                    <TableRow key={device._id} className={`hover:bg-muted/10 transition-colors border-b border-border/40 ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
                      
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-base">{device.alias || device.hostname}</span>
                          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{device.hostname}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground/80 bg-muted/50 px-2 py-1 rounded-md uppercase">
                          {device.hardwareId}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        {device.status === 'blocked' ? (
                          <Badge variant="destructive" className="gap-1 px-2.5 py-0.5 shadow-sm">
                            <Ban size={12} /> Blocked
                          </Badge>
                        ) : isOnline ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20 gap-1.5 px-2.5 py-0.5 shadow-sm">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border gap-1.5 px-2.5 py-0.5">
                            <WifiOff size={12} /> Offline
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 bg-background border px-2 py-1 rounded-lg w-fit shadow-sm">
                          <span className="text-sm font-black">{device.maxInstances || 1}</span>
                        </div>
                      </TableCell>

                      {/* 🔴 5. Groups Display (UPDATED WITH REMOVE BUTTON) */}
                      <TableCell>
                        {deviceGroupsArray.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {deviceGroupsArray.slice(0, 2).map((g) => (
                              <Badge key={g._id} variant="secondary" className="text-[11px] pr-1 pl-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 flex items-center gap-1.5 shadow-sm">
                                {g.name}
                                <div 
                                  className="cursor-pointer hover:bg-red-100 hover:text-red-600 rounded-full p-0.5 transition-colors"
                                  onClick={(e) => { 
                                    e.preventDefault(); 
                                    handleRemoveFromGroup(device.hardwareId); 
                                  }}
                                  title="Remove from group"
                                >
                                  <X size={12} />
                                </div>
                              </Badge>
                            ))}
                            {deviceGroupsArray.length > 2 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                +{deviceGroupsArray.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">Unassigned</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {device.assignedWorkflow ? (
                          <div className="flex flex-col max-w-[150px]">
                            <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-md truncate" title={device.assignedWorkflow.name}>
                              {device.assignedWorkflow.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-muted-foreground italic px-2 py-1 bg-muted/30 rounded-md">Standby</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold">
                            {new Date(device.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">Today</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end items-center gap-2">
                          {device.status === 'approved' && (
                            <Link href={`/nodes/${device.hardwareId}`}>
                              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 text-[11px] font-bold shadow-sm transition-transform hover:-translate-y-0.5">
                                <Layers size={13} /> Details
                              </Button>
                            </Link>
                          )}
                          <NodeConfigDialog 
                            hardwareId={device.hardwareId} 
                            currentAlias={device.alias || ""} 
                            currentMaxInstances={device.maxInstances || 1} 
                          />
                          <NodeActionButtons 
                            hardwareId={device.hardwareId} 
                            currentStatus={device.status} 
                          />
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
      </Card>
    </div>
  )
}