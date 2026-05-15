// web-dashboard/app/actions/tasks.ts
'use server'

import clientPromise from "@/lib/mongodb"
import { revalidatePath } from "next/cache"

export async function assignTaskToNodes(hardwareIds: string[], workflowId: string, workflowName: string) {
  // 🔴 1. EARLY EXIT: Agar array khali hai, to database ko pareshan mat karo
  if (!hardwareIds || hardwareIds.length === 0) {
    return { success: false, error: "No devices selected for deployment." };
  }

  try {
    const client = await clientPromise;
    const db = client.db("automation_db");
    
    // 🔴 2. THE SECURITY LOCK: Sirf "approved" status wale devices ko hi task milega!
    // Client (UI) chahe jo bheje, Backend apna verification khud karega.
    const result = await db.collection("devices").updateMany(
      { 
        hardwareId: { $in: hardwareIds },
        status: "approved" // 👈 The Ultimate Security Shield
      }, 
      { 
        $set: { 
          assignedWorkflow: { 
            id: workflowId,
            name: workflowName, 
            assignedAt: new Date()
          } 
        } 
      }
    );

    // Cache refresh commands
    revalidatePath('/builder');
    revalidatePath('/nodes');
    
    // Console mein pata chalega ki array mein se actually kitne valid PCs update hue
    console.log(`🚀 Deployed "${workflowName}" to ${result.modifiedCount} approved PCs.`);

    return { success: true, updatedCount: result.modifiedCount };
    
  } catch (error) {
    console.error("Task assignment failed:", error);
    return { success: false, error: "Database Error: Could not assign tasks." };
  }
}