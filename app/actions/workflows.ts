// web-dashboard/app/actions/workflows.ts
'use server'

import clientPromise from "@/lib/mongodb"
import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"

// 1. Get ALL workflows (🔴 OPTIMIZED: List view ke liye sirf lightweight data laao)
export async function getWorkflows() {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");
    
    // PROJECTION: nodes aur edges ka heavy data drop kar do
    const workflows = await db.collection("workflows")
      .find({})
      .project({ nodes: 0, edges: 0 }) 
      .sort({ updatedAt: -1 })
      .toArray();
    
    return workflows.map(wf => ({ ...wf, _id: wf._id.toString() }));
  } catch (error) {
    console.error("Failed to fetch workflows:", error);
    return [];
  }
}

// 1.5 Get a SINGLE workflow's full data (🔴 NAYA: Builder me edit karne ke liye)
export async function getWorkflowById(id: string) {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");
    const workflow = await db.collection("workflows").findOne({ _id: new ObjectId(id) });
    
    if (!workflow) return null;
    return { ...workflow, _id: workflow._id.toString() };
  } catch (error) {
    console.error("Failed to fetch workflow:", error);
    return null;
  }
}

// 2. Delete a workflow (🔴 UPGRADED: With Ghost-Cleaning)
export async function deleteWorkflow(id: string) {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");
    
    // Step 1: Workflow ko udao
    await db.collection("workflows").deleteOne({ _id: new ObjectId(id) });
    
    // Step 2: 🔴 THE FIX: Jin devices ke paas ye workflow assigned tha, unko 'Idle' kar do
    await db.collection("devices").updateMany(
      { "assignedWorkflow.id": id },
      { $set: { assignedWorkflow: null } }
    );

    revalidatePath('/workflows');
    revalidatePath('/nodes'); // Nodes dashboard bhi refresh karo
    return { success: true };
  } catch (error) {
    console.error("Failed to delete workflow:", error);
    return { success: false };
  }
}

// 3. Save / Create a workflow
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
      await db.collection("workflows").updateOne(
        { _id: new ObjectId(id) },
        { $set: workflowData }
      );
      
      // Optional Enhancement: Agar name update hua hai, to devices me bhi name sync kar sakte hain
      // (Par abhi ke liye zaroori nahi hai)
    } else {
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
}

// 4. Duplicate a workflow
export async function duplicateWorkflow(id: string) {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");
    
    const originalWorkflow = await db.collection("workflows").findOne({ _id: new ObjectId(id) });
    
    if (!originalWorkflow) {
      return { success: false, error: "Workflow not found" };
    }

    const { _id, ...workflowData } = originalWorkflow;

    const duplicatedWorkflow = {
      ...workflowData,
      name: `${originalWorkflow.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("workflows").insertOne(duplicatedWorkflow);

    revalidatePath('/workflows');
    return { success: true };
  } catch (error) {
    console.error("Failed to duplicate workflow:", error);
    return { success: false, error: "Server error during duplication" };
  }
}