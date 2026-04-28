// web-dashboard/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // Check if session cookie exists
  const session = request.cookies.get('admin_session')?.value
  const isLoginPage = request.nextUrl.pathname === '/login'
  
  // Python Wrapper API ko bypass karne do (unhe UI login nahi chahiye)
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  if (isApiRoute) return NextResponse.next()

  // Agar login nahi hai, aur login page par nahi hai -> Send to /login
  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Agar login hai, aur wapas /login khol raha hai -> Send to / (Dashboard)
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// Ye middleware kin pages par chalna chahiye:
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}