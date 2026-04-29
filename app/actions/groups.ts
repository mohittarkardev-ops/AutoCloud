'use server'

import clientPromise from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

// 1️⃣ ग्रुप बनाने का फंक्शन
export async function createDeviceGroup(groupName: string, description: string, deviceIds: string[]) {
    try {
        if (!groupName || !deviceIds || deviceIds.length === 0) {
            return { success: false, error: "Group name and at least one device are required." };
        }

        const client = await clientPromise;
        const db = client.db("automation_db");

        const newGroup = {
            name: groupName,
            description: description || "",
            createdAt: new Date(),
            deviceCount: deviceIds.length
        };

        const groupResult = await db.collection("groups").insertOne(newGroup);
        const newGroupId = groupResult.insertedId;

        await db.collection("devices").updateMany(
            { hardwareId: { $in: deviceIds } }, 
            { 
                $set: { 
                    groupId: newGroupId.toString(), 
                    groupName: groupName 
                } 
            }
        );

        revalidatePath('/nodes');
        revalidatePath('/groups'); // नए पेज को भी रिफ्रेश करने के लिए
        return { success: true };
    } catch (error: any) {
        console.error("Group Creation Error:", error);
        return { success: false, error: "Failed to create group in database." };
    }
}

// 2️⃣ किसी एक PC को ग्रुप से बाहर निकालने का फंक्शन
export async function removeDeviceFromGroup(hardwareId: string) {
    try {
        const client = await clientPromise;
        const db = client.db("automation_db");

        await db.collection("devices").updateOne(
            { hardwareId: hardwareId },
            { 
                $unset: { groupId: "", groupName: "" } 
            }
        );

        revalidatePath('/nodes');
        revalidatePath('/groups');
        return { success: true };
    } catch (error) {
        console.error("Remove Device Error:", error);
        return { success: false, error: "Failed to remove device from group." };
    }
}

// 3️⃣ पूरे ग्रुप को डिलीट करने का फंक्शन
export async function deleteGroup(groupId: string) {
    try {
        const client = await clientPromise;
        const db = client.db("automation_db");

        // 1. ग्रुप को डिलीट करें
        await db.collection("groups").deleteOne({ _id: new ObjectId(groupId) });

        // 2. इस ग्रुप के सारे PCs को Unassigned कर दें
        await db.collection("devices").updateMany(
            { groupId: groupId },
            { 
                $unset: { groupId: "", groupName: "" } 
            }
        );

        revalidatePath('/nodes');
        revalidatePath('/groups');
        return { success: true };
    } catch (error) {
        console.error("Delete Group Error:", error);
        return { success: false, error: "Failed to delete group." };
    }
}
// --- इसे app/actions/groups.ts के सबसे नीचे जोड़ दें ---

export async function updateGroupDevices(groupId: string, groupName: string, selectedHardwareIds: string[]) {
    try {
        const client = await clientPromise;
        const db = client.db("automation_db");

        // 1. सबसे पहले इस ग्रुप से सारे डिवाइसेस को हटा दें (ताकि लिस्ट फ्रेश हो जाए)
        await db.collection("devices").updateMany(
            { groupId: groupId },
            { $unset: { groupId: "", groupName: "" } }
        );

        // 2. अब जो नए डिवाइसेस सिलेक्ट किए गए हैं, उनमें यह ग्रुप ID डाल दें
        if (selectedHardwareIds && selectedHardwareIds.length > 0) {
            await db.collection("devices").updateMany(
                { hardwareId: { $in: selectedHardwareIds } },
                { $set: { groupId: groupId, groupName: groupName } }
            );
        }

        revalidatePath('/groups');
        revalidatePath('/nodes');
        revalidatePath('/builder');
        return { success: true };
    } catch (error) {
        console.error("Update Group Devices Error:", error);
        return { success: false, error: "Failed to update devices for this group." };
    }
}