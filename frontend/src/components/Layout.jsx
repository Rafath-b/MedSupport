import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Stethoscope, User, Microscope, Menu, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

const SidebarItem = ({ to, icon: Icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                isActive
                    ? "bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900 hover:shadow-sm"
            )
        }
    >
        <Icon size={20} className="relative z-10 duration-300 group-hover:scale-110" />
        <span className="font-medium relative z-10 tracking-wide text-sm">{label}</span>
        {/* Subtle shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
    </NavLink>
);

export const Layout = ({ children }) => {
    return (
        <div className="flex h-screen w-full bg-transparent overflow-hidden selection:bg-primary/20">
            {/* Sidebar */}
            <motion.aside
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-72 h-[calc(100vh-2rem)] hidden md:flex flex-col gap-8 glass-panel m-4 rounded-[2rem] p-6 shadow-2xl relative z-20 border-white/50"
            >
                <div className="flex items-center gap-3 px-2 py-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 ring-2 ring-white/50">
                        <Activity size={20} fill="currentColor" />
                    </div>
                    <div>
                        <span className="text-xl font-bold text-gray-900 tracking-tight block leading-none">
                            MedSupport
                        </span>
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                            Local AI
                        </span>
                    </div>
                </div>

                <nav className="flex flex-col gap-2">
                    <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 opacity-80">
                        Platform
                    </div>
                    <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    <SidebarItem to="/scribe" icon={Stethoscope} label="Clinical Scribe" />
                    <SidebarItem to="/patient" icon={User} label="Patient Portal" />
                    <SidebarItem to="/diagnostics" icon={Microscope} label="Diagnostics" />
                </nav>

                <div className="mt-auto">
                    <div className="rounded-xl bg-gradient-to-br from-white/40 to-white/10 border border-white/40 p-4 backdrop-blur-md shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></div>
                            <span className="text-xs font-bold text-slate-700 tracking-wide">System Online</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                            Running locally on Apple Silicon (MLX).
                        </p>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 h-full overflow-y-auto relative scroll-smooth">
                {/* Mobile Header Placeholder (could be expanded) */}
                <div className="md:hidden p-4 flex items-center justify-between glass-panel mx-4 mt-4 mb-2 rounded-xl">
                    <span className="font-bold text-gray-900">MedSupport</span>
                    <Menu className="text-gray-600" />
                </div>

                <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        {children}
                    </motion.div>
                </div>
            </main>
        </div>
    );
};
