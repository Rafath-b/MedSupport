import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((arg1, arg2) => {
        const id = Math.random().toString(36).substr(2, 9);
        let toast = { id, duration: 3000, type: 'info' };

        if (typeof arg1 === 'string') {
            toast = { ...toast, title: arg1, type: arg2 || 'info' };
        } else {
            toast = { ...toast, ...arg1 };
        }

        setToasts(prev => [...prev, toast]);

        if (toast.duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, toast.duration);
        }
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

const Toast = ({ title, description, type, onClose }) => {
    const icons = {
        success: <CheckCircle className="text-green-500" size={20} />,
        error: <AlertCircle className="text-red-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />
    };

    const styles = {
        success: "border-green-200 bg-green-50",
        error: "border-red-200 bg-red-50",
        info: "border-blue-200 bg-blue-50"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={cn(
                "pointer-events-auto w-80 md:w-96 rounded-xl border p-4 shadow-lg backdrop-blur-md bg-white/90 pr-8 relative overflow-hidden",
                styles[type] || styles.info
            )}
        >
            <div className="flex gap-3">
                {icons[type]}
                <div className="flex-1">
                    {title && <h3 className="font-semibold text-sm text-gray-900">{title}</h3>}
                    {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
                </div>
            </div>
            <button
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-900 transition-colors"
            >
                <X size={16} />
            </button>
        </motion.div>
    );
};
