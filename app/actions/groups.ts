'use server'

import clientPromise from "@/lib/mongodb"
import { revalidatePath } from "next/cache"

export async function createDeviceGroup(name: string, description: string, deviceIds: string[]) {
  try {
    if (!name || deviceIds.length === 0) {
      throw new Error("Group name and at least one device are required.");
    }

    const client = await clientPromise;
    const db = client.db("automation_db");

    // Insert the new group into the database
    await db.collection("device_groups").insertOne({
      name,
      description,
      deviceIds,
      createdAt: new Date(),
    });

    // Revalidate the page so the new group appears immediately without a hard refresh
    revalidatePath('/builder');
    revalidatePath('/devices'); // Add any other routes that need to see the new group
    
    return { success: true };
  } catch (error) {
    console.error("Failed to create group:", error);
    return { success: false, error: "Failed to create group" };
  }
}