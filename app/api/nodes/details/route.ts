import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hardwareId = searchParams.get('id');

    if (!hardwareId) return NextResponse.json({ success: false });

    const client = await clientPromise;
    const db = client.db("automation_db");
    const node = await db.collection("devices").findOne({ hardwareId });

    return NextResponse.json({ success: true, node });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}