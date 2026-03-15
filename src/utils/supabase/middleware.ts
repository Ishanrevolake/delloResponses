import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Use this in Middleware
export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with cross-browser cookies.

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isAuthRoute = request.nextUrl.pathname.startsWith('/login')

    // Protect all routes except /login, /api/responses, and Next.js internal assets
    if (
        !user &&
        !isAuthRoute &&
        !request.nextUrl.pathname.startsWith('/api/') &&
        !request.nextUrl.pathname.startsWith('/_next')
    ) {
        // Force authentication for the dashboard views by redirecting to login
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If user is already logged in and tries to access /login, redirect to the dashboard home
    if (user && isAuthRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
