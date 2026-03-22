import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb'; // Next.js by default '@' ko root se map kar leta hai

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("automation_db");
    
    // Simple ping command database ko check karne ke liye
    await db.command({ ping: 1 });

    return NextResponse.json(
      { success: true, message: "Boom! Next.js and MongoDB are connected perfectly." },
      { status: 200 }
    );
  } catch (error) {
    console.error("DB Connection Error:", error);
    return NextResponse.json(
      { success: false, error: "Database connection failed!" },
      { status: 500 }
    );
  }
}