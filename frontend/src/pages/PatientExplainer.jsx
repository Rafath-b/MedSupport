import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Input';
import { User, FileText, Sparkles, MessageCircle, HeartPulse, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useToast } from '../contexts/ToastContext';

export const PatientExplainer = () => {
    const [report, setReport] = useState('');
    const [explanation, setExplanation] = useState(null);
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            addToast('Please drop a valid image file.', 'error');
        }
    };

    const clearImage = () => {
        setImage(null);
        setPreview(null);
    };

    const simplifyReport = async () => {
        if (!report.trim() && !image) {
            addToast('Please enter text or upload an image.', 'error');
            return;
        }

        setLoading(true);
        setExplanation(null);
        try {
            let response;
            if (image) {
                const formData = new FormData();
                formData.append('file', image);
                if (report.trim()) formData.append('prompt', report); // Optional specific question

                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                response = await fetch(`${baseUrl}/api/simplify_report_multimodal`, {
                    method: 'POST',
                    body: formData,
                });
            } else {
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                response = await fetch(`${baseUrl}/api/simplify_report`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: report }), // Note: backend expects 'text' for text-only endpoint
                });
            }

            if (!response.ok) throw new Error('Simplification failed');

            const data = await response.json();
            setExplanation(data.result); // Note: backend returns 'result'
            addToast('Report simplified successfully!', 'success');
        } catch (error) {
            console.error(error);
            addToast('Failed to simplify report.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100/50 rounded-2xl border border-emerald-200/50 text-emerald-600 shadow-sm">
                    <User size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Patient Portal</h1>
                    <p className="text-slate-500 font-medium text-sm">Simple explanations for complex medical terms</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
                {/* Input Section */}
                <div className="glass-panel p-6 rounded-[2rem] flex flex-col h-full border-white/60 shadow-xl bg-white/70 backdrop-blur-3xl">
                    {/* Image Upload Area */}
                    <div className="mb-6">
                        <label className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={14} className="text-emerald-500" />
                            Upload Medical Report (Image)
                        </label>
                        {preview ? (
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                                <img src={preview} alt="Report Preview" className="w-full h-48 object-cover object-top opacity-90" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                                <button
                                    onClick={(e) => { e.preventDefault(); clearImage(); }}
                                    className="absolute top-2 right-2 p-1.5 bg-white/20 hover:bg-red-500 hover:text-white text-slate-800 rounded-full backdrop-blur-md transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => document.getElementById('report-upload').click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                className="border-2 border-dashed border-slate-300/60 hover:border-emerald-500/50 hover:bg-emerald-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 group"
                            >
                                <div className="w-12 h-12 bg-emerald-50/50 rounded-full flex items-center justify-center mx-auto text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                                </div>
                                <p className="text-sm text-slate-500 font-medium">Click or Drop photo of report</p>
                            </div>
                        )}
                        <input id="report-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </div>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase">OR TYPE BELOW</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <label className="text-xs font-bold text-slate-500 mb-4 mt-4 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14} className="text-emerald-500" />
                        Report Text or Question
                    </label>
                    <Textarea
                        placeholder="Paste report text here OR ask a question about the uploaded image..."
                        value={report}
                        onChange={(e) => setReport(e.target.value)}
                        className="flex-1 resize-none bg-white/50 focus:bg-white/80 text-base leading-relaxed p-4 border-slate-200/50"
                    />
                    <div className="mt-6 flex justify-end">
                        <Button onClick={simplifyReport} isLoading={loading} size="lg" className="w-full sm:w-auto shadow-lg shadow-emerald-500/20 bg-gradient-to-r from-emerald-500 to-teal-600 border-none hover:opacity-90 transition-all duration-300">
                            <HeartPulse size={18} className="mr-2" />
                            Simplify Language
                        </Button>
                    </div>
                </div>

                {/* Output Section */}
                <div className="glass-card p-0 rounded-[2rem] overflow-hidden flex flex-col h-full border-white/60 bg-white/40 shadow-xl ring-1 ring-white/40">
                    <div className="px-6 py-4 border-b border-white/30 bg-white/40 backdrop-blur-md">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <MessageCircle size={14} className="text-blue-500" />
                            Patient-Friendly Explanation
                        </label>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 scroll-smooth custom-scrollbar bg-gradient-to-b from-white/30 to-transparent">
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="h-full flex flex-col items-center justify-center text-center space-y-6"
                                >
                                    <div className="relative">
                                        <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Sparkles size={24} className="text-emerald-500 animate-pulse" />
                                        </div>
                                    </div>
                                    <p className="text-slate-500 font-medium animate-pulse">Translating to plain English...</p>
                                </motion.div>
                            ) : explanation ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4 }}
                                    className="prose prose-lg prose-slate max-w-none 
                                        prose-p:text-slate-700 prose-p:leading-8 prose-p:font-medium prose-p:my-4
                                        prose-p:text-slate-700 prose-p:leading-8 prose-p:font-medium prose-p:my-4"
                                >
                                    <ReactMarkdown>{explanation}</ReactMarkdown>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="h-full flex flex-col items-center justify-center text-center text-slate-400 group"
                                >
                                    <div className="p-6 rounded-3xl bg-white/40 border border-white/50 mb-4 group-hover:scale-110 transition-transform duration-500">
                                        <User size={48} className="text-slate-300 group-hover:text-emerald-500/50 transition-colors duration-500" />
                                    </div>
                                    <p className="font-medium text-slate-500">Simplified explanation will appear here</p>
                                    <div className="flex items-center gap-2 text-xs text-emerald-600/60 mt-2 bg-emerald-50/50 px-3 py-1 rounded-full border border-emerald-100/50">
                                        <Sparkles size={10} />
                                        Powered by MedGemma
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};
