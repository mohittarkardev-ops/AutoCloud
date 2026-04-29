'use server'

import clientPromise from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';

export async function createDeviceGroup(groupName: string, description: string, deviceIds: string[]) {
    try {
        if (!groupName || !deviceIds || deviceIds.length === 0) {
            return { success: false, error: "Group name and at least one device are required." };
        }

        const client = await clientPromise;
        const db = client.db("automation_db");

        // 1. Create the Group entry
        const newGroup = {
            name: groupName,
            description: description || "",
            createdAt: new Date(),
            deviceCount: deviceIds.length
        };

        const groupResult = await db.collection("groups").insertOne(newGroup);
        const newGroupId = groupResult.insertedId;

        // 2. 🔴 THE FIX: UI 'hardwareId' भेज रहा है, इसलिए डेटाबेस में hardwareId से ढूँढकर अपडेट करें
        await db.collection("devices").updateMany(
            { hardwareId: { $in: deviceIds } }, 
            { 
                $set: { 
                    groupId: newGroupId.toString(), 
                    groupName: groupName 
                } 
            }
        );

        // 3. Next.js को बताएँ कि डेटा बदल गया है, ताकि UI तुरंत बिना रिफ्रेश किए अपडेट हो जाए
        revalidatePath('/nodes');

        return { success: true };
    } catch (error: any) {
        console.error("Group Creation Error:", error);
        return { success: false, error: "Failed to create group in database." };
    }
}