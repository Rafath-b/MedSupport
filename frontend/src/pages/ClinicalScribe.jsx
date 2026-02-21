import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Input';
import { Stethoscope, FileText, Sparkles, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useToast } from '../contexts/ToastContext';

export const ClinicalScribe = () => {
    const [note, setNote] = useState('');
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [analysis, setAnalysis] = useState(null);
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

    const analyzeNote = async () => {
        if (!note.trim() && !image) {
            addToast('Please enter a note or upload an image.', 'error');
            return;
        }

        setLoading(true);
        setAnalysis(null);
        try {
            let response;
            if (image) {
                const formData = new FormData();
                formData.append('file', image);
                if (note.trim()) formData.append('prompt', note); // Optional extra context

                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                response = await fetch(`${baseUrl}/api/analyze_note_multimodal`, {
                    method: 'POST',
                    body: formData,
                });
            } else {
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                response = await fetch(`${baseUrl}/api/analyze_text`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: note }),
                });
            }

            if (!response.ok) throw new Error('Analysis failed');

            const data = await response.json();
            setAnalysis(data.result);
            addToast('Clinical note analyzed successfully!', 'success');
        } catch (error) {
            console.error(error);
            addToast('Failed to analyze note. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100/50 rounded-2xl border border-blue-200/50 text-blue-600 shadow-sm">
                    <Stethoscope size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clinical Scribe</h1>
                    <p className="text-slate-500 font-medium text-sm">AI-powered documentation assistant (Text & Image)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
                {/* Input Section */}
                <div className="glass-panel p-6 rounded-[2rem] flex flex-col h-full border-white/60 shadow-xl bg-white/70 backdrop-blur-3xl overflow-y-auto">

                    {/* Image Upload Area */}
                    <div className="mb-6">
                        <label className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={14} className="text-primary" />
                            Upload Raw Note (Image)
                        </label>
                        {preview ? (
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                                <img src={preview} alt="Note Preview" className="w-full h-48 object-cover object-top opacity-90" />
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
                                onClick={() => document.getElementById('note-upload').click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                className="border-2 border-dashed border-slate-300/60 hover:border-primary/50 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 group"
                            >
                                <div className="w-12 h-12 bg-blue-50/50 rounded-full flex items-center justify-center mx-auto text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                                </div>
                                <p className="text-sm text-slate-500 font-medium">Click or Drop image to upload note</p>
                            </div>
                        )}
                        <input id="note-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </div>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase">OR TYPE BELOW (NOTE or QUESTION)</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <label className="text-xs font-bold text-slate-500 mb-4 mt-4 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14} className="text-primary" />
                        Clinical Text
                    </label>
                    <Textarea
                        placeholder="Paste patient notes here OR ask a question about the uploaded image..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="flex-1 resize-none bg-white/50 focus:bg-white/80 text-base leading-relaxed p-4 border-slate-200/50 min-h-[200px]"
                    />
                    <div className="mt-6 flex justify-end">
                        <Button onClick={analyzeNote} isLoading={loading} size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
                            <Sparkles size={18} className="mr-2" />
                            Analyze Note
                        </Button>
                    </div>
                </div>

                {/* Output Section */}
                <div className="glass-card p-0 rounded-[2rem] overflow-hidden flex flex-col h-full border-white/60 bg-white/40 shadow-xl ring-1 ring-white/40">
                    <div className="px-6 py-4 border-b border-white/30 bg-white/40 backdrop-blur-md flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles size={14} className="text-purple-500" />
                            Structured Summary
                        </label>
                        {analysis && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { navigator.clipboard.writeText(analysis); addToast('Copied to clipboard', 'info') }}
                                className="h-8 text-slate-500 hover:text-primary hover:bg-primary/5"
                            >
                                <Copy size={14} className="mr-1.5" /> Copy
                            </Button>
                        )}
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
                                        <div className="w-20 h-20 border-4 border-blue-100 border-t-primary rounded-full animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Sparkles size={24} className="text-primary animate-pulse" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">Analyzing Note...</h3>
                                        <p className="text-sm text-slate-500 mt-1">Extracting entities and structuring data.</p>
                                    </div>
                                </motion.div>
                            ) : analysis ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="prose prose-sm md:prose-base prose-slate max-w-none 
                                        prose-headings:font-bold prose-headings:text-slate-800 prose-headings:tracking-tight
                                        prose-p:text-slate-600 prose-p:leading-relaxed prose-p:font-medium
                                        prose-li:text-slate-600 prose-li:marker:text-primary
                                        prose-strong:text-slate-900 prose-strong:font-bold"
                                >
                                    <ReactMarkdown>{analysis}</ReactMarkdown>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="h-full flex flex-col items-center justify-center text-center text-slate-400 group"
                                >
                                    <div className="p-6 rounded-3xl bg-white/40 border border-white/50 mb-4 group-hover:scale-110 transition-transform duration-500">
                                        <FileText size={48} className="text-slate-300 group-hover:text-primary/50 transition-colors duration-500" />
                                    </div>
                                    <p className="font-medium text-slate-500">Analysis results will appear here</p>
                                    <p className="text-xs text-slate-400 mt-1">Ready for input</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};
