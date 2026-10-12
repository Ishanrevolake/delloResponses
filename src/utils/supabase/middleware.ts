import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Use this in Middleware
export async function updateSession(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    const isAuthRoute = pathname.startsWith('/login')
    const isApiRoute = pathname.startsWith('/api/')
    const isStaticAsset =
        pathname.startsWith('/_next') ||
        pathname === '/favicon.ico' ||
        /\.[^/]+$/.test(pathname)

    if (isApiRoute || isStaticAsset) {
        return NextResponse.next({ request })
    }

    const hasSupabaseAuthCookie = request.cookies
        .getAll()
        .some(({ name }) => name.startsWith('sb-') && name.includes('auth-token'))

    if (!hasSupabaseAuthCookie && !isAuthRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (!hasSupabaseAuthCookie && isAuthRoute) {
        return NextResponse.next({ request })
    }

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
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

    // Protect dashboard routes.
    if (!user && !isAuthRoute) {
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
