import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// 🔴 THE MAGIC: Next.js ko strict order ki is API ko kabhi cache na kare
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");
    
    // Simple ping command database ko check karne ke liye
    await db.command({ ping: 1 });

    return NextResponse.json(
      { success: true, message: "Boom! Next.js and MongoDB are connected perfectly.", timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    console.error("DB Connection Error:", error);
    return NextResponse.json(
      { success: false, error: "Database connection failed!", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}