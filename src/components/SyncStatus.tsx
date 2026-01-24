
import { twMerge } from 'tailwind-merge';

interface SyncStatusProps {
    status: 'synced' | 'saving' | 'unsaved';
    className?: string;
}

export const SyncStatus = ({ status, className }: SyncStatusProps) => {
    if (status === 'synced') return null;

    return (
        <div
            className={twMerge(
                'text-xs text-stone-400 font-medium transition-opacity duration-300 select-none',
                status === 'saving' && 'animate-pulse',
                className
            )}
        >
            {status === 'saving' ? 'Saving...' : 'Unsaved'}
        </div>
    );
};
