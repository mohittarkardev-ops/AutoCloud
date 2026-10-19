'use client'

import { useState, useTransition, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ShieldCheck, Save, MonitorCog } from "lucide-react"
import { changeAdminPassword } from "@/app/actions/settings"
// import { saveGeneralSettings } from "@/app/actions/settings" // Hypothetical action you will need

export function SettingsClient({ initialEmail = "" }: { initialEmail?: string }) {
  // ── General Settings State ──
  const [isGeneralPending, startGeneralTransition] = useTransition();
  const [appName, setAppName] = useState("AutoCloud");
  const [adminEmail, setAdminEmail] = useState(initialEmail);
  const [generalMsg, setGeneralMsg] = useState({ type: "", text: "" });

  // ── Password States ──
  const [isPasswordPending, startPasswordTransition] = useTransition();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState({ type: "", text: "" });

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (pwdMsg.text) {
      const timer = setTimeout(() => setPwdMsg({ type: "", text: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [pwdMsg]);

  useEffect(() => {
    if (generalMsg.text) {
      const timer = setTimeout(() => setGeneralMsg({ type: "", text: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [generalMsg]);

  const handleSaveGeneral = () => {
    setGeneralMsg({ type: "", text: "" });

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (adminEmail && !emailRegex.test(adminEmail)) {
      setGeneralMsg({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    startGeneralTransition(async () => {
      // Replace with your actual server action
      // const res = await saveGeneralSettings(appName, adminEmail);
      
      // Simulated response for now
      const res = { success: true, message: "Preferences saved successfully!" };
      
      if (res.success) {
        setGeneralMsg({ type: "success", text: res.message });
      } else {
        setGeneralMsg({ type: "error", text: res.error || "Failed to save preferences." });
      }
    });
  };

  const handlePasswordChange = () => {
    setPwdMsg({ type: "", text: "" });

    if (newPassword.length < 6) {
      setPwdMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: "error", text: "New passwords do not match!" });
      return;
    }

    if (oldPassword === newPassword) {
      setPwdMsg({ type: "error", text: "New password must be different from the old one." });
      return;
    }

    startPasswordTransition(async () => {
      try {
        const res = await changeAdminPassword(oldPassword, newPassword);
        if (res.success) {
          setPwdMsg({ type: "success", text: res.message || "Password updated successfully!" });
          setOldPassword(""); 
          setNewPassword(""); 
          setConfirmPassword("");
        } else {
          setPwdMsg({ type: "error", text: res.error || "Failed to update password. Please check your current password." });
        }
      } catch (error) {
        setPwdMsg({ type: "error", text: "An unexpected network error occurred." });
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
          
          {generalMsg.text && (
            <div className={`p-3 rounded-md text-sm font-medium ${generalMsg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
              {generalMsg.text}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Application Name</label>
            <Input 
              value={appName} 
              onChange={(e) => setAppName(e.target.value)}
              className="bg-background" 
            />
            <p className="text-[11px] text-muted-foreground">The name displayed on the sidebar and titles.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Admin Email Contact</label>
            <Input 
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@example.com" 
            />
          </div>
        </CardContent>
        <CardFooter className="border-t border-border/30 pt-4 bg-muted/5">
          <Button 
            className="gap-2" 
            variant="secondary"
            onClick={handleSaveGeneral}
            disabled={isGeneralPending}
          >
            {isGeneralPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>}
            Save Preferences
          </Button>
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
          
          {pwdMsg.text && (
            <div className={`p-3 rounded-md text-sm font-medium ${pwdMsg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
              {pwdMsg.text}
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
            disabled={!oldPassword || !newPassword || !confirmPassword || isPasswordPending}
          >
            {isPasswordPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Change Password
          </Button>
        </CardFooter>
      </Card>

    </div>
  )
}