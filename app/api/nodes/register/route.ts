import clientPromise from "@/lib/mongodb"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { hardwareId, hostname, os } = await req.json();

    if (!hardwareId) {
      return NextResponse.json({ success: false, error: "Hardware ID missing" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("automation_db");
    const now = new Date();

    // 🔴 THE MAGIC: Upsert (Sirf 1 Database Hit mein Update aur Insert dono)
    const result = await db.collection("devices").findOneAndUpdate(
      { hardwareId },
      {
        // $set: यह डेटा हमेशा अपडेट होगा (चाहे डिवाइस पुराना हो या नया)
        $set: { 
          lastSeen: now, 
          hostname, 
          os 
        },
        // $setOnInsert: यह डेटा सिर्फ तब डलेगा जब डिवाइस पहली बार रजिस्टर हो रहा हो
        $setOnInsert: {
          alias: "New Unassigned PC",
          status: "pending", 
          maxInstances: 3, // Aapki standard limit
          assignedWorkflow: null,
          pendingCommands: {},
          liveMetrics: {},
          createdAt: now
        }
      },
      { 
        upsert: true, // Agar nahi mila to naya bana do
        returnDocument: 'after' // Operation ke baad ka latest data wapas karo
      }
    );

    // MongoDB v7 driver seedha document return karta hai
    const deviceStatus = result ? result.status : "pending";

    return NextResponse.json({ 
        success: true, 
        message: "Device synced successfully", 
        status: deviceStatus 
    });

  } catch (error) {
    console.error("Registration API Error:", error);
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 });
  }
}