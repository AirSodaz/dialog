import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { X, Moon, Sun, Folder, Sparkles, Settings as SettingsIcon, Key, Server, Hash } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getConfigValue, setConfigValue, getStorageDir, DialogConfig } from '../utils/config';
import clsx from 'clsx';

type SettingsTab = 'general' | 'ai';

const PROVIDERS = [
    { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
    { id: 'gemini', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/' },
    { id: 'claude', name: 'Anthropic Claude', baseUrl: 'https://api.anthropic.com/v1' },
    { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com' },
    { id: 'custom', name: 'Custom (OpenAI Compatible)', baseUrl: '' },
] as const;

export default function SettingsModal() {
    const { settingsOpen, closeSettings } = useAppStore(useShallow((state) => ({
        settingsOpen: state.settingsOpen,
        closeSettings: state.closeSettings,
    })));
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

    // General Settings State
    const [isDark, setIsDark] = useState(false);
    const [storagePath, setStoragePath] = useState('');

    // AI Settings State
    const [aiConfig, setAiConfig] = useState<DialogConfig['ai']>({
        provider: 'openai',
        baseUrl: '',
        apiKey: '',
        model: ''
    });

    useEffect(() => {
        // Load settings on open
        const loadSettings = async () => {
            const theme = await getConfigValue('theme');
            const isDarkMode = theme === 'dark' || document.documentElement.classList.contains('dark');
            setIsDark(isDarkMode);

            const dir = await getStorageDir();
            setStoragePath(dir);

            const ai = await getConfigValue('ai');
            if (ai) {
                setAiConfig(ai);
            }
        };

        if (settingsOpen) {
            loadSettings();
        }
    }, [settingsOpen]);

    const toggleTheme = async () => {
        const html = document.documentElement;
        if (isDark) {
            html.classList.remove('dark');
            await setConfigValue('theme', 'light');
            setIsDark(false);
        } else {
            html.classList.add('dark');
            await setConfigValue('theme', 'dark');
            setIsDark(true);
        }
    };

    const updateAiConfig = async (key: keyof DialogConfig['ai'], value: string) => {
        const newConfig = { ...aiConfig, [key]: value };
        setAiConfig(newConfig);
        await setConfigValue('ai', newConfig);
    };

    const handleProviderChange = async (providerId: string) => {
        const provider = PROVIDERS.find(p => p.id === providerId);
        if (provider) {
            // retain key and model if just switching provider, or maybe reset base url? 
            // usually better to reset base url to the provider's default if it's not custom
            const newBaseUrl = provider.id === 'custom' ? aiConfig.baseUrl : provider.baseUrl;

            const newConfig = {
                ...aiConfig,
                provider: provider.id as any,
                baseUrl: newBaseUrl
            };
            setAiConfig(newConfig);
            await setConfigValue('ai', newConfig);
        }
    };

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && settingsOpen) {
                closeSettings();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [settingsOpen, closeSettings]);

    if (!settingsOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={closeSettings}
        >
            <div
                className="w-full max-w-2xl h-[500px] bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden flex"
                onClick={e => e.stopPropagation()}
            >
                {/* Sidebar */}
                <div className="w-48 bg-stone-50 dark:bg-stone-900/50 border-r border-stone-200 dark:border-stone-700 flex flex-col">
                    <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                        <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                            Settings
                        </h2>
                    </div>
                    <nav className="flex-1 p-2 space-y-1">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={clsx(
                                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                activeTab === 'general'
                                    ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm border border-stone-200 dark:border-stone-700/50"
                                    : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50"
                            )}
                        >
                            <SettingsIcon className="w-4 h-4" />
                            General
                        </button>
                        <button
                            onClick={() => setActiveTab('ai')}
                            className={clsx(
                                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                activeTab === 'ai'
                                    ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm border border-stone-200 dark:border-stone-700/50"
                                    : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/50"
                            )}
                        >
                            <Sparkles className="w-4 h-4" />
                            AI Services
                        </button>
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-700 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm">
                        <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                            {activeTab === 'general' ? 'General Settings' : 'AI Services'}
                        </h2>
                        <button
                            onClick={closeSettings}
                            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                {/* Theme Toggle */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-stone-800 dark:text-stone-200">
                                            Appearance
                                        </div>
                                        <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                            Switch between light and dark mode
                                        </div>
                                    </div>
                                    <button
                                        onClick={toggleTheme}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                                    >
                                        {isDark ? (
                                            <>
                                                <Moon className="w-4 h-4" />
                                                <span className="text-sm">Dark</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sun className="w-4 h-4" />
                                                <span className="text-sm">Light</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Storage Info */}
                                <div className="pt-4 border-t border-stone-200 dark:border-stone-700">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-2 bg-stone-100 dark:bg-stone-800 rounded-lg text-stone-500">
                                            <Folder className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="text-sm font-medium text-stone-800 dark:text-stone-200">
                                                Storage Location
                                            </div>
                                            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 break-all font-mono bg-stone-50 dark:bg-stone-950/50 p-2 rounded border border-stone-200 dark:border-stone-800">
                                                {storagePath || 'Loading...'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div className="space-y-6">
                                {/* Provider Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                                        AI Provider
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        <select
                                            value={aiConfig.provider}
                                            onChange={(e) => handleProviderChange(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500"
                                        >
                                            {PROVIDERS.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                                        Select the AI provider you want to use for inline generation.
                                    </p>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-700">
                                    {/* Base URL */}
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                                            <Server className="w-3.5 h-3.5" />
                                            Base URL
                                        </label>
                                        <input
                                            type="text"
                                            value={aiConfig.baseUrl}
                                            onChange={(e) => updateAiConfig('baseUrl', e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500 font-mono text-sm"
                                            placeholder="https://api.openai.com/v1"
                                        />
                                    </div>

                                    {/* API Key */}
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                                            <Key className="w-3.5 h-3.5" />
                                            API Key
                                        </label>
                                        <input
                                            type="password"
                                            value={aiConfig.apiKey}
                                            onChange={(e) => updateAiConfig('apiKey', e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500 font-mono text-sm"
                                            placeholder="sk-..."
                                        />
                                        <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                                            Your key is stored locally in <code>.dialog/config.json</code>.
                                        </p>
                                    </div>

                                    {/* Model */}
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                                            <Hash className="w-3.5 h-3.5" />
                                            Model Name
                                        </label>
                                        <input
                                            type="text"
                                            value={aiConfig.model}
                                            onChange={(e) => updateAiConfig('model', e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500 font-mono text-sm"
                                            placeholder="gpt-4o"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50">
                        <div className="text-xs text-stone-400 dark:text-stone-500 text-center">
                            Dialog v0.1.0-alpha
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
