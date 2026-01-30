import { twMerge } from 'tailwind-merge';

interface SyncStatusProps {
    status: 'synced' | 'saving' | 'unsaved';
    className?: string;
}

/**
 * Component to display the current synchronization status.
 * Visual feedback for saving, saved, and unsaved states.
 */
export const SyncStatus = ({ status, className }: SyncStatusProps) => {
    return (
        <div
            role="status"
            aria-live="polite"
            className={twMerge(
                'text-xs text-stone-400 font-medium transition-opacity duration-300 select-none',
                status === 'saving' && 'animate-pulse',
                status === 'synced' ? 'opacity-0' : 'opacity-100',
                className
            )}
        >
            {status === 'saving' ? 'Saving...' : (status === 'synced' ? 'Saved' : 'Unsaved')}
        </div>
    );
};
