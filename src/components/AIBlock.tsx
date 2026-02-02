import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Sparkles, ArrowUp, Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { getConfigValue } from '../utils/config';

/**
 * Tiptap NodeView for interacting with AI providers.
 * Allows users to input prompts and receive generated text directly in the editor.
 */
export const AIBlock = ({ node, deleteNode, editor }: NodeViewProps) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input on mount
    useEffect(() => {
        setTimeout(() => {
            inputRef.current?.focus();
        }, 50);

        // Check for auto-trigger
        if (node.attrs.autoTrigger && node.attrs.initialPrompt) {
            setPrompt(node.attrs.initialPrompt);
            // Trigger submit immediately
            triggerAI(node.attrs.initialPrompt);
        }
    }, []);

    const triggerAI = async (text: string) => {
        if (!text.trim() || isLoading) return;
        setIsLoading(true);
        setError(null);

        try {
            const aiConfig = await getConfigValue('ai');
            const provider = aiConfig?.provider || 'openai';
            const apiKey = aiConfig?.apiKey;
            const baseUrl = aiConfig?.baseUrl || 'https://api.openai.com/v1';
            const model = aiConfig?.model || 'gpt-4o';

            if (!apiKey && provider !== 'custom') {
                setError('API Key is missing in Settings.');
                setIsLoading(false);
                return;
            }

            const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: 'You are a helpful writing assistant. Generate concise improvement or continuation for the user text. Output ONLY the result text.' },
                        { role: 'user', content: text }
                    ],
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';

            if (content) {
                deleteNode();
                editor.commands.insertContent(content);
            }

        } catch (error: any) {
            setError(error.message || 'Failed to generate content');
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        triggerAI(prompt);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            deleteNode();
        }
    };

    return (
        <NodeViewWrapper className="my-2">
            <div className="w-full max-w-2xl mx-auto rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden transition-all">
                <div className="flex items-center gap-3 p-1">
                    <div
                        className="flex items-center justify-center w-8 h-8 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 shrink-0 ml-1"
                        role="status"
                        aria-label={isLoading ? "Generating content" : "AI Assistant"}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-stone-500 dark:text-stone-400" />
                        ) : (
                            <Sparkles className="w-4 h-4" aria-hidden="true" />
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            placeholder={isLoading ? "Generating..." : "Ask AI to write something..."}
                            aria-label="AI prompt"
                            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 h-9"
                        />
                        {!isLoading && (
                            <button
                                type="submit"
                                disabled={!prompt.trim()}
                                aria-label="Submit prompt"
                                title="Submit prompt"
                                className="p-1.5 rounded-md bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity mr-1"
                            >
                                <ArrowUp className="w-4 h-4" />
                            </button>
                        )}
                    </form>
                </div>

                {error && (
                    <div
                        className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-900/30 flex items-center gap-2 text-xs text-red-600 dark:text-red-400"
                        role="alert"
                    >
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};
