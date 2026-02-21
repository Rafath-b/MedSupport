import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(({
    className,
    variant = 'primary',
    size = 'default',
    isLoading = false,
    children,
    disabled,
    ...props
}, ref) => {
    const variants = {
        primary: "bg-gradient-to-r from-primary to-blue-600 text-white hover:opacity-90 shadow-lg shadow-blue-500/25 border border-transparent",
        secondary: "bg-white/80 backdrop-blur-sm text-slate-700 border border-slate-200 hover:bg-white hover:border-slate-300 shadow-sm",
        ghost: "hover:bg-slate-100/50 text-slate-600 hover:text-slate-900",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20",
        outline: "border border-primary text-primary hover:bg-primary/5 bg-transparent"
    };

    const sizes = {
        default: "h-11 px-6 py-2 text-sm",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10 p-2 flex items-center justify-center"
    };

    return (
        <button
            ref={ref}
            disabled={disabled || isLoading}
            className={cn(
                "inline-flex items-center justify-center rounded-xl font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
});

Button.displayName = "Button";
