// web-dashboard/app/actions/tasks.ts
'use server'
import clientPromise from "@/lib/mongodb"
import { revalidatePath } from "next/cache"

export async function assignTaskToNodes(hardwareIds: string[], workflowId: string, workflowName: string) {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");
    
    // Yahan hum task ko permanent assign kar rahe hain
    await db.collection("devices").updateMany(
      { hardwareId: { $in: hardwareIds } }, 
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

    revalidatePath('/builder');
    revalidatePath('/nodes');
    return { success: true };
  } catch (error) {
    console.error("Task assignment failed:", error);
    return { success: false };
  }
}