import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hardwareId = searchParams.get('id');

    if (!hardwareId) {
        return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("automation_db");

    // 🔴 THE MAGIC: Projection (Sirf kaam ka data laao, network bandwidth bachao)
    const node = await db.collection("devices").findOne(
      { hardwareId },
      { 
        projection: { 
          _id: 0, // MongoDB ki internal ID hide kar do (Security)
          hardwareId: 1, 
          hostname: 1, 
          alias: 1,
          status: 1, 
          lastSeen: 1,
          liveMetrics: 1,
          // 'assignedWorkflow' ko backend me hi chhod do agar UI par uska bada JSON nahi dikhana hai
          'assignedWorkflow.name': 1, // Sirf workflow ka naam bhejo, pura data nahi!
          'assignedWorkflow.id': 1
        } 
      }
    );

    // 🔴 UX FIX: Agar node nahi mila to saf-saf error bhejo
    if (!node) {
      return NextResponse.json({ success: false, error: "Device not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, node });

  } catch (error) {
    console.error("GET Node Error:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}