import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { AuthForm } from './AuthForm'

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

    const resolvedSearchParams = await searchParams;

    return (
        <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
            <div className="w-full max-w-md p-8 space-y-6 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
                <AuthForm message={resolvedSearchParams?.message} />
            </div>
        </div>
    )
}
