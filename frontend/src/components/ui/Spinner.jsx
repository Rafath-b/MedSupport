import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Spinner = ({ className, size = 24 }) => {
    return (
        <Loader2
            className={cn("animate-spin text-primary", className)}
            size={size}
        />
    );
};
