import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: Request) {
  const { hardwareId } = await req.json();
  const client = await clientPromise;
  const db = client.db("automation_db");

  const device = await db.collection("devices").findOne({ hardwareId });

  // Agar device approve nahi hai, toh use block kar do
  if (!device || device.status !== 'approved') {
    return NextResponse.json({ action: 'sleep', message: 'Not approved by Admin' });
  }

  // Agar admin ne dashboard se koi task assign kiya hai
  if (device.assignedFlow) {
    // Task de do, aur database se clear kar do taaki baar baar na kare
    await db.collection("devices").updateOne({ hardwareId }, { $set: { assignedFlow: null } });
    return NextResponse.json({ action: 'execute', flowDetails: device.assignedFlow });
  }

  // Koi task nahi hai, toh use 'idle' rehne bolo
  return NextResponse.json({ action: 'idle' });
}