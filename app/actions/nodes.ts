'use server'

import clientPromise from "@/lib/mongodb"
import { revalidatePath } from "next/cache"

// 1. Remote Control Logic (Start/Stop/Restart)
export async function sendNodeCommand(hardwareId: string, cmd: "START" | "STOP" | "RESTART", port: string) {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");

    // Multi-port command assignment
    await db.collection("devices").updateOne(
      { hardwareId },
      { $set: { [`pendingCommands.${port}`]: cmd } }
    );

    revalidatePath('/nodes');
    revalidatePath(`/nodes/${hardwareId}`);

    return { success: true };
  } catch (error) {
    console.error("Send Command Error:", error);
    return { success: false, error: "Failed to send command" };
  }
}

// 2. Configuration Update Logic (Alias & Ports update from Dialog)
export async function updateNodeConfig(hardwareId: string, alias: string, maxInstances: number) {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");

    await db.collection("devices").updateOne(
      { hardwareId },
      { $set: { alias, maxInstances } }
    );

    revalidatePath('/nodes');
    return { success: true };
  } catch (error) {
    console.error("Config Update Error:", error);
    return { success: false, error: "Failed to update configuration" };
  }
}

// 3. Access Management Logic (Approve / Block Device)
export async function updateNodeStatus(hardwareId: string, status: "approved" | "blocked" | "pending") {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");

    await db.collection("devices").updateOne(
      { hardwareId },
      { 
        $set: { 
          status,
          ...(status === 'blocked' ? { assignedWorkflow: null, pendingCommands: {} } : {})
        } 
      }
    );

    revalidatePath('/nodes');
    revalidatePath(`/nodes/${hardwareId}`); 
    revalidatePath('/'); 
    return { success: true };
  } catch (error) {
    console.error("Status Update Error:", error);
    return { success: false, error: "Failed to update device status" };
  }
}

// 4. Delete Node Logic (🔴 UPGRADED with Ghost-Cleaning)
export async function deleteNode(hardwareId: string) {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");

    // 1. Pehle PC ko 'devices' table se udao
    await db.collection("devices").deleteOne({ hardwareId });

    // 2. 🔴 THE FIX: Groups me check karo, agar ye PC kisi group me tha to usko wahan se bhi 'pull' (delete) kar do
    // Taki system me koi 'Ghost ID' na bache!
    await db.collection("deviceGroups").updateMany(
      { deviceIds: hardwareId },
      { $pull: { deviceIds: hardwareId } as any } 
    );

    revalidatePath('/nodes');
    revalidatePath('/'); 
    return { success: true };
  } catch (error) {
    console.error("Delete Node Error:", error);
    return { success: false, error: "Failed to delete device" };
  }
}