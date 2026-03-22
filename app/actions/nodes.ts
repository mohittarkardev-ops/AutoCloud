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

    // 🔴 NAYA: UI ko turant refresh karne ke liye taaki loading state update ho
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
          // 🔴 THE FIX: Purane 'pendingCommand' ko hatakar naya multi-port object clear kiya
          ...(status === 'blocked' ? { assignedWorkflow: null, pendingCommands: {} } : {})
        } 
      }
    );

    revalidatePath('/nodes');
    revalidatePath(`/nodes/${hardwareId}`); // Detail page bhi update hoga
    revalidatePath('/'); // Overview page bhi update hoga
    return { success: true };
  } catch (error) {
    console.error("Status Update Error:", error);
    return { success: false, error: "Failed to update device status" };
  }
}

// 4. Delete Node Logic
export async function deleteNode(hardwareId: string) {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");

    await db.collection("devices").deleteOne({ hardwareId });

    revalidatePath('/nodes');
    revalidatePath('/'); 
    return { success: true };
  } catch (error) {
    console.error("Delete Node Error:", error);
    return { success: false, error: "Failed to delete device" };
  }
}