"use client";

import { motion } from "framer-motion";
import { Copy, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";

interface VerificationStepProps {
    code: string;
    checkLinked: () => void;
    getCode: () => void;
    isChecking: boolean;
    onBack: () => void;
}

export function VerificationStep({
    code,
    checkLinked,
    getCode,
    isChecking,
    onBack,
}: VerificationStepProps) {
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
    };

    return (
        <OnboardingStep className="flex flex-col items-center max-w-md mx-auto w-full text-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
            >
                <div className="bg-primary/10 p-4 rounded-full inline-block mb-6 text-primary">
                    <CheckCircle2 size={48} />
                </div>
            </motion.div>

            <h2 className="text-3xl font-bold mb-2">Verify Connections</h2>
            <p className="text-muted-foreground mb-8 text-lg">
                Send this code to your bot in Telegram to verify ownership.
            </p>

            <div className="bg-card glass-card border border-border/50 rounded-xl p-6 w-full mb-8 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={handleCopy}>
                        <Copy size={16} />
                    </Button>
                </div>
                <p className="font-mono text-4xl font-bold tracking-wider text-primary select-all">
                    {code}
                </p>
            </div>

            <div className="flex flex-col gap-3 w-full">
                <Button
                    onClick={checkLinked}
                    disabled={isChecking}
                    size="lg"
                    className="w-full h-12 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                    {isChecking ? <Loader2 className="animate-spin mr-2" /> : "I sent it"}
                </Button>

                <div className="flex justify-between w-full mt-4">
                    <Button variant="ghost" onClick={onBack} disabled={isChecking}>
                        Back
                    </Button>
                    <Button variant="ghost" onClick={getCode} disabled={isChecking}>
                        Get new code
                    </Button>
                </div>
            </div>
        </OnboardingStep>
    );
}
