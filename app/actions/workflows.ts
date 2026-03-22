// web-dashboard/app/actions/workflows.ts
'use server'

import clientPromise from "@/lib/mongodb"
import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"

// 1. Get all workflows
export async function getWorkflows() {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");
    const workflows = await db.collection("workflows").find({}).sort({ updatedAt: -1 }).toArray();
    
    // Convert ObjectId to string for Client Components
    return workflows.map(wf => ({ ...wf, _id: wf._id.toString() }));
  } catch (error) {
    console.error("Failed to fetch workflows:", error);
    return [];
  }
}

// 2. Delete a workflow
export async function deleteWorkflow(id: string) {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");
    await db.collection("workflows").deleteOne({ _id: new ObjectId(id) });
    revalidatePath('/workflows');
    return { success: true };
  } catch (error) {
    console.error("Failed to delete workflow:", error);
    return { success: false };
  }
}

// web-dashboard/app/actions/workflows.ts (Append this function)

export async function saveWorkflow(id: string | null, name: string, description: string, nodes: any[], edges: any[]) {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");
    
    const workflowData = {
      name,
      description,
      nodes,
      edges,
      nodesCount: nodes.length,
      updatedAt: new Date()
    };

    if (id) {
      // Agar purana workflow edit ho raha hai
      await db.collection("workflows").updateOne(
        { _id: new ObjectId(id) },
        { $set: workflowData }
      );
    } else {
      // Agar naya workflow ban raha hai
      await db.collection("workflows").insertOne({
        ...workflowData,
        createdAt: new Date()
      });
    }

    revalidatePath('/workflows');
    return { success: true };
  } catch (error) {
    console.error("Failed to save workflow:", error);
    return { success: false };
  }
}// (Save wala logic hum Visual Builder wale code mein jodege baad mein)