"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface OnboardingStepProps {
    children: ReactNode;
    className?: string; // Allow passing Tailwind classes
}

export function OnboardingStep({ children, className }: OnboardingStepProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
