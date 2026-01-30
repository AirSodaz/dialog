import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names with Tailwind CSS conflict resolution.
 * Combines `clsx` for conditional class logic and `tailwind-merge` for handling Tailwind class conflicts.
 *
 * @param inputs The class values to merge (strings, objects, arrays, etc.).
 * @returns {string} The merged class string.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
