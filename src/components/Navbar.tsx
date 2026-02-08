"use client";

import React from "react";
import { motion } from "framer-motion";

const Navbar = () => {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-8 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-8 px-6 py-2.5 rounded-full border border-white/10 bg-black/20 backdrop-blur-md shadow-2xl">
        {/* Logo / Icon Area */}
        <div className="flex items-center gap-2 pr-4 border-r border-white/10">
          <div className="relative w-5 h-5 flex items-center justify-center">
            <div className="absolute inset-0 border border-white/40 rounded-sm" />
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          <NavLink href="#home">Home</NavLink>
          <NavLink href="#mission">Mission</NavLink>
          <NavLink href="#usecases">Use cases</NavLink>
        </div>
      </div>
    </motion.nav>
  );
};

const NavLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    className="text-[13px] font-medium text-white/70 hover:text-white transition-colors tracking-tight"
  >
    {children}
  </a>
);

export default Navbar;
