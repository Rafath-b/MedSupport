import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Input';
import { Microscope, Upload, Image as ImageIcon, Sparkles, X, AlertCircle, ScanEye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useToast } from '../contexts/ToastContext';

export const DiagnosticsLab = () => {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [prompt, setPrompt] = useState('Analyze this medical image and identify any abnormalities.');
    const [analysis, setAnalysis] = useState(null);
    const [annotations, setAnnotations] = useState([]);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setAnnotations([]);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setImage(file);
            setAnnotations([]);
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
        setAnalysis(null);
        setAnnotations([]);
    };

    const analyzeImage = async () => {
        if (!image) {
            addToast('Please upload an image to analyze.', 'error');
            return;
        }

        setLoading(true);
        setAnalysis(null);
        setAnnotations([]);

        const formData = new FormData();
        formData.append('file', image);
        formData.append('prompt', prompt);

        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${baseUrl}/api/analyze_image`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Analysis failed');

            const data = await response.json();
            setAnalysis(data.result);
            if (data.annotations) {
                setAnnotations(data.annotations);
            }
            addToast('Image analyzed successfully!', 'success');
        } catch (error) {
            console.error(error);
            addToast('Failed to analyze image.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-8">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-100/50 rounded-2xl border border-purple-200/50 text-purple-600 shadow-sm">
                    <Microscope size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Diagnostics Lab</h1>
                    <p className="text-slate-500 font-medium text-sm">Multimodal AI analysis for medical imaging</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Upload Section */}
                <div className="space-y-6">
                    <div
                        className={`border-2 border-dashed rounded-[2.5rem] p-8 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center h-[28rem] relative overflow-hidden group
                            ${preview ? 'border-purple-300 bg-purple-50/20' : 'border-slate-200 hover:border-purple-400 hover:bg-white/60 bg-white/40 shadow-inner'}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => !preview && document.getElementById('image-upload').click()}
                    >
                        {preview ? (
                            <div className="relative w-full h-full flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-500">
                                <div className="relative inline-block max-h-full max-w-full">
                                    <img src={preview} alt="Preview" className="max-h-full max-w-full rounded-2xl shadow-xl object-contain block" />
                                    {/* Render Bounding Boxes */}
                                    {annotations.map((ann, index) => {
                                        const [xmin, ymin, xmax, ymax] = ann.box_2d;
                                        return (
                                            <div
                                                key={index}
                                                className="absolute border-2 border-red-500 bg-red-500/10 rounded-sm pointer-events-none z-20"
                                                style={{
                                                    left: `${xmin * 100}%`,
                                                    top: `${ymin * 100}%`,
                                                    width: `${(xmax - xmin) * 100}%`,
                                                    height: `${(ymax - ymin) * 100}%`,
                                                }}
                                            >
                                                <span className="absolute -top-6 left-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                                                    {ann.label || 'Abnormality'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none"></div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); clearImage(); }}
                                    className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md border border-white/20 hover:scale-110 shadow-lg z-30"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="pointer-events-none space-y-6 relative z-10">
                                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto text-purple-500 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-purple-200/50">
                                    <Upload size={40} className="group-hover:-translate-y-1 transition-transform duration-300" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xl font-bold text-slate-700 tracking-tight">Drop medical image here</p>
                                    <p className="text-sm text-slate-400 font-medium">or click to browse file system</p>
                                </div>
                                <div className="text-[10px] font-bold text-slate-400/80 bg-white/50 px-4 py-2 rounded-full inline-block border border-white/60 uppercase tracking-widest">
                                    X-Ray • MRI • CT • Dermoscopy
                                </div>
                            </div>
                        )}
                        <input
                            id="image-upload"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                    </div>

                    <div className="glass-panel p-6 rounded-[2rem] border-white/60 bg-white/70 shadow-lg">
                        <label className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                            <ScanEye size={14} className="text-purple-500" />
                            Clinical Question
                        </label>
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="mb-4 bg-white/60 border-slate-200/50"
                            placeholder="What would you like to know about this image?"
                        />
                        <Button
                            onClick={analyzeImage}
                            isLoading={loading}
                            className="w-full shadow-lg shadow-purple-500/20 bg-gradient-to-r from-purple-500 to-fuchsia-600 border-none hover:opacity-90 h-12 text-base rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                            disabled={!image}
                        >
                            <Sparkles size={18} className="mr-2" />
                            Run Vision Analysis
                        </Button>
                    </div>
                </div>

                {/* Analysis Result Section */}
                <div className="glass-card p-0 rounded-[2.5rem] overflow-hidden flex flex-col h-[40rem] border-white/60 bg-white/40 shadow-xl ring-1 ring-white/40">
                    <div className="px-6 py-4 border-b border-white/30 bg-white/40 backdrop-blur-md flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles size={14} className="text-purple-500" />
                            AI Findings
                        </label>
                        {analysis && <div className="px-2 py-1 bg-purple-100/50 text-purple-600 text-[10px] font-bold rounded-lg border border-purple-200/50">CONFIDENTIAL</div>}
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
                                        <div className="w-20 h-20 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Sparkles size={24} className="text-purple-500 animate-pulse" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">Scanning Image...</h3>
                                        <p className="text-sm text-slate-500 mt-1">Analyzing visual patterns and anomalies.</p>
                                    </div>
                                </motion.div>
                            ) : analysis ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="prose prose-slate prose-lg max-w-none 
                                        prose-headings:text-purple-900 prose-headings:font-bold prose-headings:tracking-tight
                                        prose-strong:text-purple-700
                                        prose-p:text-slate-600 prose-p:leading-relaxed"
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
                                        <ImageIcon size={48} className="text-slate-300 group-hover:text-purple-500/50 transition-colors duration-500" />
                                    </div>
                                    <p className="font-medium text-slate-500">Upload an image to see analysis findings</p>
                                    <p className="text-xs text-slate-400 mt-1">Secure & Local Processing</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};
