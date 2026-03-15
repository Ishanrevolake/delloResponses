"use client";

import { useFormStatus } from "react-dom";
import { login, signup } from "./actions";
import { Loader2 } from "lucide-react";

export function SubmitButtons() {
    const { pending, action } = useFormStatus();

    const isLogin = pending && action === login;
    const isSignup = pending && action === signup;

    return (
        <div className="flex flex-col space-y-3 pt-2">
            <button
                formAction={login}
                disabled={pending}
                className="inline-flex items-center justify-center rounded-md text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-11 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--primary),0.3)] active:scale-[0.98]"
            >
                {isLogin ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                    </>
                ) : (
                    "Sign In"
                )}
            </button>
        </div>
    );
}
