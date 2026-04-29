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
// --- app/actions/groups.ts (नीचे यह कोड जोड़ दें) ---

// 1. PC को ग्रुप से हटाकर 'Unassigned' करने का फंक्शन
export async function removeDeviceFromGroup(hardwareId: string) {
    try {
        const client = await clientPromise;
        const db = client.db("automation_db");

        await db.collection("devices").updateOne(
            { hardwareId: hardwareId },
            { 
                $unset: { groupId: "", groupName: "" } // $unset फील्ड्स को डेटाबेस से उड़ा देता है
            }
        );

        revalidatePath('/nodes');
        return { success: true };
    } catch (error) {
        console.error("Remove Device Error:", error);
        return { success: false, error: "Failed to remove device from group." };
    }
}

// 2. पूरे ग्रुप को डिलीट करने का फंक्शन (इससे ग्रुप के सारे PC ऑटोमैटिक अनअसाइन हो जाएंगे)
import { ObjectId } from 'mongodb'; // फाइल के सबसे ऊपर अगर नहीं है तो लगा लें

export async function deleteGroup(groupId: string) {
    try {
        const client = await clientPromise;
        const db = client.db("automation_db");

        // 1. ग्रुप को 'groups' कलेक्शन से डिलीट करें
        await db.collection("groups").deleteOne({ _id: new ObjectId(groupId) });

        // 2. उन सभी डिवाइसेस को 'Unassigned' करें जो इस ग्रुप में थे
        await db.collection("devices").updateMany(
            { groupId: groupId },
            { 
                $unset: { groupId: "", groupName: "" } 
            }
        );

        revalidatePath('/nodes');
        return { success: true };
    } catch (error) {
        console.error("Delete Group Error:", error);
        return { success: false, error: "Failed to delete group." };
    }
}