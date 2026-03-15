import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { SubmitButtons } from './SubmitButtons'
import { signup } from './actions'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message: string }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        return redirect('/')
    }

    // Next.js 15 requires awaiting searchParams if it's treated as a Promise in the new semantics,
    // but for simplicity we will just extract it if it's there.
    const resolvedSearchParams = await searchParams;

    return (
        <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
            <div className="w-full max-w-md p-8 space-y-6 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tighter text-zinc-50">Welcome Back</h1>
                    <p className="text-zinc-400">Sign in to your account to view your responses.</p>
                </div>

                <form className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none text-zinc-300" htmlFor="email">
                            Email
                        </label>
                        <input
                            className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                            id="email"
                            name="email"
                            placeholder="m@example.com"
                            required
                            type="email"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none text-zinc-300" htmlFor="password">
                            Password
                        </label>
                        <input
                            className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                            id="password"
                            name="password"
                            required
                            type="password"
                        />
                    </div>

                    <SubmitButtons />

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-zinc-900 px-2 text-zinc-500 font-medium">Or</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-zinc-400">
                            Not a member?{" "}
                            <button 
                                formAction={signup}
                                className="text-primary hover:text-primary/80 transition-colors font-bold"
                            >
                                Sign Up Now
                            </button>
                        </p>
                    </div>

                    {resolvedSearchParams?.message && (
                        <p className="mt-4 p-4 bg-zinc-800/50 text-red-400 text-center text-sm rounded-md border border-red-900/50">
                            {resolvedSearchParams.message}
                        </p>
                    )}
                </form>
            </div>
        </div>
    )
}
