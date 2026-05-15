// web-dashboard/lib/batchUpdater.ts
import clientPromise from '@/lib/mongodb';

// यह हमारी ग्लोबल RAM (Memory) है जहाँ सारे PCs का डेटा जमा होगा
let updateQueue: Record<string, any> = {};
let isProcessing = false;

// यह फंक्शन डेटाबेस की जगह RAM में डेटा सेव करेगा (0ms time)
export function queueStatusUpdate(hardwareId: string, updateData: any) {
    if (!updateQueue[hardwareId]) {
        updateQueue[hardwareId] = { $set: {} };
    }
    // नया डेटा पुराने डेटा के साथ मर्ज कर दो
    Object.assign(updateQueue[hardwareId].$set, updateData);
}

// यह मास्टर फंक्शन हर 10 सेकंड में चुपचाप बैकग्राउंड में चलेगा
async function processBatch() {
    if (isProcessing || Object.keys(updateQueue).length === 0) return;
    isProcessing = true;

    // Queue से सारा डेटा एक झोले में डालो और असली Queue को खाली कर दो ताकि नए पिंग्स आते रहें
    const batchToProcess = { ...updateQueue };
    updateQueue = {}; 

    try {
        const client = await clientPromise;
        const db = client.db("automation_db");
        const devicesCollection = db.collection("devices");

        // MongoDB का सबसे ताक़तवर फीचर: BulkWrite
        const bulkOps = Object.keys(batchToProcess).map(hwId => ({
            updateOne: {
                filter: { hardwareId: hwId },
                update: { $set: batchToProcess[hwId].$set }
            }
        }));

        if (bulkOps.length > 0) {
            await devicesCollection.bulkWrite(bulkOps, { ordered: false });
            console.log(`💾 [Memory Batch] Saved ${bulkOps.length} PCs to MongoDB in 1 hit!`);
        }
    } catch (error) {
        console.error("Batch update failed:", error);
        // अगर फेल हुआ, तो डेटा वापस RAM में डाल दो ताकि अगली बार चला जाए (Data Loss = 0)
        for (const hwId of Object.keys(batchToProcess)) {
            queueStatusUpdate(hwId, batchToProcess[hwId].$set);
        }
    } finally {
        isProcessing = false;
    }
}

// यह लूप सिर्फ एक बार स्टार्ट होगा और हर 10 सेकंड में 'processBatch' को कॉल करेगा
const globalWithMongo = global as typeof globalThis & { _batchInterval?: NodeJS.Timeout };
if (!globalWithMongo._batchInterval) {
    globalWithMongo._batchInterval = setInterval(processBatch, 10000); // 10000ms = 10 Seconds
}