'use client'

import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, MonitorSmartphone, PlayCircle, 
  Settings, Network, ShieldCheck 
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const navItems = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Nodes & Devices', href: '/nodes', icon: MonitorSmartphone },
  { name: 'Assign Tasks', href: '/builder', icon: PlayCircle },
  { name: 'Workflows', href: '/workflows', icon: Network },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-card/50 backdrop-blur-xl p-6 flex flex-col hidden md:flex sticky top-0 h-screen">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <ShieldCheck className="text-primary-foreground w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
          AutoCloud
        </h1>
      </div>

      <nav className="flex flex-col gap-1.5 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href}>
              <Button 
                variant={isActive ? "secondary" : "ghost"} 
                className={cn(
                  "w-full justify-start gap-3 h-11 transition-all duration-200",
                  isActive ? "font-bold shadow-sm" : "text-muted-foreground hover:translate-x-1"
                )}
              >
                <item.icon size={18} className={isActive ? "text-primary" : ""} />
                {item.name}
              </Button>
            </Link>
          )
        })}
      </nav>
      
      <div className="mt-auto pt-6 border-t border-border/50">
        <div className="bg-muted/30 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
             <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
             <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">System Engine</p>
          </div>
          <p className="text-sm font-semibold truncate">Admin Panel</p>
          <p className="text-xs text-muted-foreground">v2.1.0-stable</p>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
          <Settings size={18} />
          Settings
        </Button>
      </div>
    </aside>
  )
}