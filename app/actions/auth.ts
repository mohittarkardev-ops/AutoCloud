// web-dashboard/app/actions/auth.ts
'use server'

import { cookies } from 'next/headers'

export async function login(password: string) {
  const correctPassword = process.env.ADMIN_PASSWORD;

  if (password === correctPassword) {
    // Next.js 15/16+ require 'await' for cookies()
    const cookieStore = await cookies();
    
    // 7 dino ke liye secure session cookie set kar rahe hain
    cookieStore.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    return { success: true };
  }
  
  return { success: false, error: 'Incorrect password' };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
}