'use client'

import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, MonitorSmartphone, PlayCircle, 
  Settings, Network, ShieldCheck, Layers 
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const navItems = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Nodes & Devices', href: '/nodes', icon: MonitorSmartphone },
  { name: 'Device Groups', href: '/groups', icon: Layers }, // 🔴 NAYA: Groups Page Link
  { name: 'Assign Tasks', href: '/builder', icon: PlayCircle },
  { name: 'Workflows', href: '/workflows', icon: Network },
]

// 🎨 UI-only helper: one consistent nav-item look (design.md §5.2)
function NavLink({
  href, name, Icon, isActive,
}: {
  href: string
  name: string
  Icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 h-12 px-4 rounded-xl text-sm transition-colors duration-200",
        isActive
          ? "text-foreground font-semibold bg-card shadow-sm"
          : "text-muted-foreground font-medium hover:bg-accent hover:text-foreground"
      )}
    >
      {/* Signature green active bar, flush with the sidebar edge */}
      {isActive && (
        <span className="absolute -left-6 top-1/2 -translate-y-1/2 h-8 w-1.5 rounded-r-full bg-primary" />
      )}
      <Icon size={20} strokeWidth={1.75} className={isActive ? "text-primary" : ""} />
      {name}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const settingsActive = pathname.startsWith('/settings')

  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar p-6 flex flex-col hidden md:flex sticky top-0 h-screen">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="h-10 w-10 rounded-full bg-brand-gradient flex items-center justify-center shadow-lg shadow-primary/20">
          <ShieldCheck className="text-primary-foreground w-5 h-5" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          AutoCloud
        </h1>
      </div>

      <p className="px-4 mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Menu
      </p>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          // 🌟 SMART UPGRADE: Highlight parent tab even if you are on a sub-page (e.g., /nodes/123)
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <NavLink key={item.name} href={item.href} name={item.name} Icon={item.icon} isActive={isActive} />
          )
        })}
      </nav>

      <p className="px-4 mt-8 mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        General
      </p>

      {/* 🔴 NAYA: Settings Link & Active State */}
      <NavLink href="/settings" name="Settings" Icon={Settings} isActive={settingsActive} />

      {/* Status card — dark-green widget style */}
      <div className="mt-auto pt-6">
        <div className="bg-dark-widget rounded-3xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-brand-200 animate-pulse" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">System Engine</p>
          </div>
          <p className="text-sm font-medium truncate">Admin Panel</p>
          <p className="text-xs text-white/60">v2.1.0-stable</p>
        </div>
      </div>
    </aside>
  )
}
