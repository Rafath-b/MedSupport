import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, User, Microscope, ArrowRight, ShieldCheck, Zap, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const FeatureCard = ({ title, description, icon: Icon, to, gradient, delay }) => (
    <Link to={to} className="block h-full">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
            className="p-8 rounded-[2rem] glass-card h-full flex flex-col justify-between cursor-pointer group bg-gradient-to-br from-white/80 to-white/40 border border-white/60"
        >
            <div>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-6 shadow-lg shadow-gray-200 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900 tracking-tight">{title}</h3>
                <p className="text-gray-500 leading-relaxed font-medium">{description}</p>
            </div>

            <div className="mt-8 flex items-center text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                Launch Tool
                <div className="ml-2 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:translate-x-2 transition-transform duration-300">
                    <ArrowRight size={14} />
                </div>
            </div>
        </motion.div>
    </Link>
);

export const Dashboard = () => {
    return (
        <div className="space-y-12 py-6">
            <div className="space-y-6 max-w-3xl">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-blue-600 text-[11px] font-bold uppercase tracking-widest shadow-sm"
                >
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    v2.0 Beta Live
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                >
                    <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-4">
                        Your AI Medical <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Assistant.</span>
                    </h1>
                    <p className="text-xl text-slate-500 leading-relaxed max-w-2xl font-medium">
                        Secure, local-first intelligence for clinical documentation, patient education, and diagnostic support. optimized for Apple Silicon.
                    </p>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <FeatureCard
                    title="Clinical Scribe"
                    description="Automated clinical note generation and entity extraction from raw doctor notes."
                    icon={Stethoscope}
                    to="/scribe"
                    gradient="from-blue-500 to-indigo-600"
                    delay={0.2}
                />
                <FeatureCard
                    title="Patient Portal"
                    description="Instantly translate complex medical reports into clear, patient-friendly language."
                    icon={User}
                    to="/patient"
                    gradient="from-emerald-400 to-teal-500"
                    delay={0.3}
                />
                <FeatureCard
                    title="Diagnostics Lab"
                    description="Multimodal AI analysis for medical imaging and visual anomaly detection."
                    icon={Microscope}
                    to="/diagnostics"
                    gradient="from-purple-500 to-fuchsia-500"
                    delay={0.4}
                />
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                <div className="p-6 rounded-2xl bg-white/40 border border-white/50 flex items-center gap-4">
                    <ShieldCheck className="text-gray-400" />
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">Privacy First</h4>
                        <p className="text-xs text-gray-500">All inference runs locally. No cloud.</p>
                    </div>
                </div>
                <div className="p-6 rounded-2xl bg-white/40 border border-white/50 flex items-center gap-4">
                    <Zap className="text-gray-400" />
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">Apple Silicon Optimized</h4>
                        <p className="text-xs text-gray-500">Accelerated by MLX framework.</p>
                    </div>
                </div>
                <div className="p-6 rounded-2xl bg-white/40 border border-white/50 flex items-center gap-4">
                    <Activity className="text-gray-400" />
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">MedGemma 4B</h4>
                        <p className="text-xs text-gray-500">Instruction-tuned medical LLM.</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
