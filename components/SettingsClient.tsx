'use client'

import { useState, useTransition } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ShieldCheck, Save, MonitorCog } from "lucide-react"
import { changeAdminPassword } from "@/app/actions/settings"

export function SettingsClient() {
  const [isPending, startTransition] = useTransition();
  
  // Password States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  const handlePasswordChange = () => {
    setMsg({ type: "", text: "" });

    if (newPassword !== confirmPassword) {
      setMsg({ type: "error", text: "New passwords do not match!" });
      return;
    }

    startTransition(async () => {
      const res = await changeAdminPassword(oldPassword, newPassword);
      if (res.success) {
        setMsg({ type: "success", text: res.message || "Password updated!" });
        setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      } else {
        setMsg({ type: "error", text: res.error || "Failed to update." });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* 🛠️ Card 1: General Preferences */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="bg-muted/10 border-b border-border/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
              <MonitorCog size={20} />
            </div>
            <div>
              <CardTitle className="text-lg">System Preferences</CardTitle>
              <CardDescription>Basic application settings and UI behavior.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Application Name</label>
            <Input defaultValue="AutoCloud" disabled className="bg-muted/50" />
            <p className="text-[11px] text-muted-foreground">The name displayed on the sidebar and titles.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Admin Email Contact</label>
            <Input placeholder="admin@example.com" />
          </div>
        </CardContent>
        <CardFooter className="border-t border-border/30 pt-4 bg-muted/5">
          <Button className="gap-2" variant="secondary"><Save size={16}/> Save Preferences</Button>
        </CardFooter>
      </Card>

      {/* 🔐 Card 2: Security & Password */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="bg-muted/10 border-b border-border/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <CardTitle className="text-lg">Security Settings</CardTitle>
              <CardDescription>Update your administrator password here.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          
          {msg.text && (
            <div className={`p-3 rounded-md text-sm font-medium ${msg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
              {msg.text}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Current Password</label>
            <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm New Password</label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </CardContent>
        <CardFooter className="border-t border-border/30 pt-4 bg-muted/5 flex justify-end">
          <Button 
            className="gap-2 bg-red-600 hover:bg-red-700 text-white" 
            onClick={handlePasswordChange}
            disabled={!oldPassword || !newPassword || !confirmPassword || isPending}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Change Password
          </Button>
        </CardFooter>
      </Card>

    </div>
  )
}