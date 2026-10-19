// web-dashboard/app/actions/auth.ts
'use server'

import { cookies } from 'next/headers'
import clientPromise from '@/lib/mongodb'
import bcrypt from 'bcryptjs'

export async function login(password: string) {
  if (!password) {
    return { success: false, error: 'Password is required' };
  }

  try {
    const client = await clientPromise;
    const db = client.db("automation_db");

    // 1. Fetch the superadmin document from MongoDB
    const admin = await db.collection("admins").findOne({ role: "superadmin" });
    
    if (!admin) {
      return { success: false, error: 'Admin account not configured in database' };
    }

    // 2. Securely compare the typed password against the hashed password
    const isMatch = await bcrypt.compare(password, admin.password);

    if (isMatch) {
      // Next.js 15/16+ require 'await' for cookies()
      const cookieStore = await cookies();
      
      // 7 dino ke liye secure session cookie set kar rahe hain
      cookieStore.set('admin_session', 'authenticated', {
        httpOnly: true,
        // 🔴 THE FIX: Temporarily set secure to false so it works on HTTP IP Address
        secure: false, 
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });
      return { success: true };
    }
    
    return { success: false, error: 'Incorrect password' };
  } catch (error) {
    console.error('Login Error:', error);
    return { success: false, error: 'Server error during authentication' };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
}