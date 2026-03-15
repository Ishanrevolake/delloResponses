"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { login, signup } from "./actions";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Input } from "@/components/ui/input";

export function AuthForm({ message }: { message?: string }) {
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(message || "");

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError("");

        const formData = new FormData(event.currentTarget);
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (mode === "signup" && password !== confirmPassword) {
            setError("Passwords do not match.");
            setIsLoading(false);
            return;
        }

        try {
            if (mode === "signin") {
                await login(formData);
            } else {
                await signup(formData);
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tighter text-zinc-50">
                    {mode === "signin" ? "Welcome Back" : "Create Account"}
                </h1>
                <p className="text-zinc-400">
                    {mode === "signin" 
                        ? "Sign in to your account to view your responses." 
                        : "Join Dello Dash to start managing your form responses."}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-zinc-300" htmlFor="email">
                        Email
                    </label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-700"
                    />
                </div>

                <PasswordInput 
                    label="Password" 
                    id="password" 
                    name="password" 
                    required 
                    placeholder="Enter your password"
                />

                {mode === "signup" && (
                    <PasswordInput 
                        label="Confirm Password" 
                        id="confirmPassword" 
                        name="confirmPassword" 
                        required 
                        placeholder="Re-enter your password"
                    />
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center rounded-md text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-11 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--primary),0.3)] active:scale-[0.98]"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {mode === "signin" ? "Signing In..." : "Creating Account..."}
                        </>
                    ) : (
                        mode === "signin" ? "Sign In" : "Sign Up"
                    )}
                </button>

                {error && (
                    <p className="mt-4 p-4 bg-zinc-800/50 text-red-400 text-center text-sm rounded-md border border-red-900/50">
                        {error}
                    </p>
                )}

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
                        {mode === "signin" ? "Not a member? " : "Already have an account? "}
                        <button
                            type="button"
                            onClick={() => {
                                setMode(mode === "signin" ? "signup" : "signin");
                                setError("");
                            }}
                            className="text-primary hover:text-primary/80 transition-colors font-bold"
                        >
                            {mode === "signin" ? "Sign Up Now" : "Sign In Instead"}
                        </button>
                    </p>
                </div>
            </form>
        </div>
    );
}
