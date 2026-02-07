"use client";

import { motion } from "framer-motion";
import { Bot, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";

export function ConnectTelegramStep({
    token,
    setToken,
    onSubmit,
    isLoading,
    error,
    onBack,
}: {
    token: string;
    setToken: (t: string) => void;
    onSubmit: () => void;
    isLoading: boolean;
    error: string | null;
    onBack?: () => void;
}) {
    return (
        <OnboardingStep className="flex flex-col items-center max-w-md mx-auto w-full">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-8 p-4 bg-blue-500/10 rounded-full text-blue-500"
            >
                <Bot size={48} />
            </motion.div>

            <h2 className="text-3xl font-bold mb-2 text-center text-foreground">
                Connect your Bot
            </h2>
            <p className="text-muted-foreground text-center mb-8 max-w-xs">
                Paste the token from @BotFather below.
            </p>

            <div className="w-full relative group">
                <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste your bot token..."
                    className="w-full bg-transparent border-b-2 border-muted focus:border-primary text-2xl py-2 px-1 outline-none transition-colors placeholder:text-muted/30 text-center font-mono"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && token) onSubmit();
                    }}
                />
                <div className="absolute bottom-0 left-0 h-[2px] bg-primary w-0 group-focus-within:w-full transition-all duration-300" />
            </div>

            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm mt-4"
                >
                    {error}
                </motion.p>
            )}

            <div className="flex gap-4 mt-12 w-full">
                {onBack && (
                    <Button variant="ghost" onClick={onBack} className="flex-1">
                        Back
                    </Button>
                )}
                <Button
                    onClick={onSubmit}
                    disabled={isLoading || !token}
                    className="flex-1 h-12 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin mr-2" />
                    ) : (
                        <>
                            Connect <ChevronRight className="ml-1 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>
        </OnboardingStep>
    );
}
