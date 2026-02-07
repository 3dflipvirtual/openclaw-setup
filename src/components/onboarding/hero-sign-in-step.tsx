"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";

export function HeroSignInStep({ onSignIn }: { onSignIn: () => void }) {
    return (
        <OnboardingStep className="flex flex-col items-center justify-center text-center space-y-8">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
            >
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-xl opacity-20 rounded-full" />
                    <h1 className="relative text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        OpenClaw
                    </h1>
                </div>
                <p className="mt-4 text-lg text-muted-foreground max-w-sm mx-auto">
                    Deploy your Telegram agent effortlessly. <br /> Connect, verify, and launch.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
            >
                <Button
                    onClick={onSignIn}
                    size="lg"
                    className="rounded-full px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 dark:bg-gray-900 dark:text-white dark:border-gray-800"
                >
                    <GoogleIcon />
                    <span className="ml-2">Continue with Google</span>
                </Button>
            </motion.div>
        </OnboardingStep>
    );
}
