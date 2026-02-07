"use client";

import { motion } from "framer-motion";
import { CheckCheck, CloudLightning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";

interface DeployStepProps {
    onDeploy: () => void;
    isPaid: boolean;
    isDeploying: boolean;
    deployError: string | null;
    deployDone: boolean;
}

export function DeployStep({
    onDeploy,
    isPaid,
    isDeploying,
    deployError,
    deployDone,
}: DeployStepProps) {
    return (
        <OnboardingStep className="flex flex-col items-center max-w-md mx-auto w-full text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
            >
                <div className="bg-gradient-to-tr from-green-400 to-blue-500 p-4 rounded-full inline-block mb-6 text-white shadow-lg shadow-green-400/20">
                    <CloudLightning size={48} />
                </div>
            </motion.div>

            <h2 className="text-3xl font-bold mb-2">Ready to Launch</h2>
            <p className="text-muted-foreground mb-8 text-lg">
                Deploy your agent to our secure cloud infrastructure.
            </p>

            {deployDone ? (
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-green-500/10 border border-green-500/20 text-green-600 rounded-xl p-6 w-full flex flex-col items-center shadow-lg"
                >
                    <CheckCheck size={48} className="mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Deployed Successfully!</h3>
                    <p className="text-sm">Your agent is now live. Message your bot on Telegram to start chatting.</p>
                </motion.div>
            ) : (
                <div className="w-full space-y-4">
                    <Button
                        onClick={onDeploy}
                        disabled={isDeploying}
                        size="lg"
                        className="w-full h-14 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 ring-offset-2 focus:ring-2 ring-indigo-500"
                    >
                        {isDeploying ? (
                            <Loader2 className="animate-spin mr-2" />
                        ) : isPaid ? (
                            "Deploy Agent"
                        ) : (
                            "Pay & Deploy"
                        )}
                    </Button>

                    {deployError && (
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-500 text-sm mt-2 bg-red-50 p-2 rounded-md border border-red-100 dark:bg-red-900/10 dark:border-red-900/20"
                        >
                            {deployError}
                        </motion.p>
                    )}

                    <p className="text-xs text-muted-foreground mt-4">
                        By deploying, you agree to our Terms of Service.
                    </p>
                </div>
            )}
        </OnboardingStep>
    );
}
