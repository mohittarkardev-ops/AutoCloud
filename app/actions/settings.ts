'use server'

import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
// import { getServerSession } from 'next-auth'; // Or however you handle auth!

export async function changeAdminPassword(oldPass: string, newPass: string) {
    try {
        // 1. Session Authorization (Example)
        // const session = await getServerSession();
        // if (!session || session.user.role !== 'admin') {
        //     return { success: false, error: "Unauthorized access." };
        // }

        if (!oldPass || !newPass) {
            return { success: false, error: "Both fields are required." };
        }
        
        if (newPass.length < 6) {
            return { success: false, error: "New password must be at least 6 characters long." };
        }

        const client = await clientPromise;
        const db = client.db("automation_db");

        // 2. Fetch the admin user
        const admin = await db.collection("admins").findOne({ role: "superadmin" });
        if (!admin) {
            return { success: false, error: "Admin account not found." };
        }

        // 3. Securely compare the old password with the hashed password in DB
        const isMatch = await bcrypt.compare(oldPass, admin.password);
        if (!isMatch) {
            return { success: false, error: "Incorrect current password." };
        }

        // 4. Hash the new password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPass, salt);

        // 5. Save the new hashed password
        await db.collection("admins").updateOne(
            { role: "superadmin" }, 
            { $set: { password: hashedPassword, updatedAt: new Date() } }
        );

        return { success: true, message: "Password updated securely!" };
    } catch (error) {
        console.error("Password Update Error:", error);
        return { success: false, error: "Internal server error." };
    }
}

// ==============================================================
// ADDED: Action for the "System Preferences" card we built earlier
// ==============================================================
export async function saveGeneralSettings(appName: string, adminEmail: string) {
    try {
        if (!adminEmail.includes('@')) {
            return { success: false, error: "Invalid email format." };
        }

        const client = await clientPromise;
        const db = client.db("automation_db");

        // Upsert (update if exists, insert if it doesn't) the global settings
        await db.collection("settings").updateOne(
            { type: "global_preferences" },
            { 
                $set: { 
                    appName: appName, 
                    adminEmail: adminEmail,
                    updatedAt: new Date() 
                } 
            },
            { upsert: true }
        );

        return { success: true, message: "Preferences saved successfully!" };
    } catch (error) {
        console.error("General Settings Error:", error);
        return { success: false, error: "Failed to save preferences." };
    }
}