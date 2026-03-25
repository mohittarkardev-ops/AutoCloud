// web-dashboard/app/workflows/page.tsx
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Network, Plus, Edit2, FileJson, GitCommit } from "lucide-react"
import Link from "next/link"
import { getWorkflows } from "@/app/actions/workflows"
import { DeleteWorkflowButton } from "@/components/DeleteWorkflowButton" 
import { DuplicateWorkflowButton } from "@/components/DuplicateWorkflowButton" 
import { ExportWorkflowButton } from "@/components/ExportWorkflowButton" // 🔴 NEW: Export Button
import { ImportWorkflowButton } from "@/components/ImportWorkflowButton" // 🔴 NEW: Import Button
import { Sidebar } from "@/components/Sidebar" 

export default async function WorkflowsListPage() {
  // 🔴 THE FIX: TypeScript strictness bypass
  const workflows: any[] = await getWorkflows();

  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-background">
      
      <Sidebar />

      <main className="flex-1 p-8 lg:p-12 max-w-7xl mx-auto w-full">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-2">Workflows</h2>
            <p className="text-muted-foreground font-medium">Design, manage, and edit your automation blueprints.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-muted/40 px-4 py-2 rounded-2xl border border-border/50">
              <Network size={16} className="text-muted-foreground"/>
              <span className="text-sm font-bold">{workflows.length} Total Blueprints</span>
            </div>

            {/* 🔴 NEW: Import JSON Button Added Here */}
            <ImportWorkflowButton />

            <Link href="/workflows/builder">
              <Button className="rounded-full px-6 h-11 font-bold shadow-xl shadow-primary/20 gap-2">
                <Plus size={18} strokeWidth={3} /> Create New Flow
              </Button>
            </Link>
          </div>
        </header>

        <Card className="border-none shadow-sm bg-card/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30 hover:bg-muted/30">
                <TableRow className="border-b border-border/50">
                  <TableHead className="w-[45%] font-bold text-xs uppercase tracking-widest text-muted-foreground">Blueprint Name</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Complexity</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Last Modified</TableHead>
                  <TableHead className="text-right pr-6 font-bold text-xs uppercase tracking-widest text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {workflows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="bg-muted/30 p-4 rounded-full mb-4">
                          <Network size={40} className="opacity-20" />
                        </div>
                        <p className="font-bold text-lg text-foreground">No blueprints found</p>
                        <p className="text-sm mt-1 mb-6">Start by designing your first automation logic.</p>
                        <Link href="/workflows/builder">
                          <Button variant="default" className="gap-2 rounded-full font-bold px-6 shadow-md">
                            <Plus size={16} /> Design New Flow
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  workflows.map((wf: any) => (
                    <TableRow key={wf._id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                      
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-primary/10 rounded-xl shadow-inner">
                            <FileJson className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex flex-col">
                             <span className="font-bold text-base">{wf.name}</span>
                             <span className="text-[11px] text-muted-foreground font-medium line-clamp-1 max-w-[350px] mt-0.5">
                               {wf.description || "Automation blueprint for remote execution."}
                             </span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1.5 bg-background border px-2.5 py-1 rounded-lg w-fit shadow-sm">
                          <GitCommit size={14} className="text-primary/70" />
                          <span className="text-[11px] font-black uppercase tracking-wider">
                            {wf.nodesCount || 0} Steps
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold">
                            {new Date(wf.updatedAt || wf.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                            {new Date(wf.updatedAt || wf.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2 items-center">
                          <Link href={`/workflows/builder?id=${wf._id}`}>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 text-[11px] font-bold shadow-sm transition-transform hover:-translate-y-0.5">
                              <Edit2 size={13} /> Edit
                            </Button>
                          </Link>

                          {/* 🔴 NEW: Export Button Added Here */}
                          <ExportWorkflowButton workflow={wf} />
                          
                          <DuplicateWorkflowButton id={wf._id} />

                          <DeleteWorkflowButton id={wf._id} />
                        </div>
                      </TableCell>

                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

      </main>
    </div>
  )
}