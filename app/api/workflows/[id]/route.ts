// web-dashboard/app/api/workflows/[id]/route.ts
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  // Next.js 15+: params is a Promise — must be awaited before use
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params first — this is the #1 cause of "Not found" in Next.js 15
    const { id } = await params;

    // Validate the ID format before hitting the DB
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid workflow ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("automation_db");

    const workflow = await db.collection("workflows").findOne({
      _id: new ObjectId(id),
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, message: "Workflow not found" },
        { status: 404 }
      );
    }

    // Convert _id to string so JSON serialization works cleanly
    return NextResponse.json({
      success: true,
      workflow: {
        ...workflow,
        _id: workflow._id.toString(),
      },
    });

  } catch (e) {
    console.error("GET /api/workflows/[id] error:", e);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}