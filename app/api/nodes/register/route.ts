import clientPromise from "@/lib/mongodb"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { hardwareId, hostname, os } = await req.json();
    const client = await clientPromise;
    const db = client.db("automation_db");

    // 1. Check if device already exists
    const existingDevice = await db.collection("devices").findOne({ hardwareId });

    if (existingDevice) {
      // Sirf lastSeen aur info update karo
      await db.collection("devices").updateOne(
        { hardwareId },
        { $set: { lastSeen: new Date(), hostname, os } }
      );
      return NextResponse.json({ success: true, message: "Device synced", status: existingDevice.status });
    }

    // 2. New Device Registration
    const newDevice = {
      hardwareId,
      hostname,
      os,
      alias: "",
      status: "pending", // Default status is pending
      maxInstances: 1,
      assignedWorkflow: null,
      lastSeen: new Date(),
      createdAt: new Date(),
    };

    await db.collection("devices").insertOne(newDevice);
    return NextResponse.json({ success: true, message: "Device registered for approval", status: "pending" });

  } catch (error) {
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 });
  }
}