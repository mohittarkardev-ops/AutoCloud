import { Sidebar } from "@/components/Sidebar"
import { SettingsClient } from "@/components/SettingsClient"
import { Settings as SettingsIcon } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-background">
      <Sidebar />

      <main className="flex-1 p-8 lg:p-12 max-w-6xl mx-auto w-full">
        <header className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm">
            <SettingsIcon className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-1">Settings & Security</h2>
            <p className="text-muted-foreground font-medium">Manage your system preferences and secure your admin access.</p>
          </div>
        </header>

        {/* Client Interface */}
        <SettingsClient />

      </main>
    </div>
  )
}