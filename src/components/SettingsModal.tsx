import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { X, Moon, Sun, Folder, Sparkles, Settings as SettingsIcon, Key, Server, Hash, Eye, EyeOff } from 'lucide-react';
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

/**
 * Settings modal component.
 * Manages application configuration including theme and AI provider settings.
 */
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
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        // Load settings on open
        const loadSettings = async () => {
            try {
                const theme = await getConfigValue('theme');
                const isDarkMode = theme === 'dark' || document.documentElement.classList.contains('dark');
                setIsDark(isDarkMode);

                const dir = await getStorageDir();
                setStoragePath(dir);

                const ai = await getConfigValue('ai');
                if (ai) {
                    setAiConfig(ai);
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        };

        if (settingsOpen) {
            loadSettings();
        }
    }, [settingsOpen]);

    const toggleTheme = () => {
        const html = document.documentElement;
        const newIsDark = !isDark;

        // Optimistic update
        setIsDark(newIsDark);
        if (newIsDark) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }

        // Persist
        setConfigValue('theme', newIsDark ? 'dark' : 'light').catch(err => {
            console.error('Failed to save theme preference:', err);
        });
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
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-title"
                className="w-full max-w-2xl h-[500px] bg-modal rounded-xl shadow-2xl border border-border-base overflow-hidden flex"
                onClick={e => e.stopPropagation()}
            >
                {/* Sidebar */}
                <div className="w-48 bg-surface/50 border-r border-border-base flex flex-col">
                    <div className="p-4 border-b border-border-base">
                        <h2 id="settings-title" className="text-sm font-semibold text-subtle uppercase tracking-wider">
                            Settings
                        </h2>
                    </div>
                    <nav className="flex-1 p-2 space-y-1" role="tablist" aria-orientation="vertical">
                        <button
                            role="tab"
                            id="tab-general"
                            aria-selected={activeTab === 'general'}
                            aria-controls="panel-general"
                            onClick={() => setActiveTab('general')}
                            className={clsx(
                                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:outline-none",
                                activeTab === 'general'
                                    ? "bg-modal text-ink shadow-sm border border-border-base"
                                    : "text-muted hover:bg-surface-hover"
                            )}
                        >
                            <SettingsIcon className="w-4 h-4" />
                            General
                        </button>
                        <button
                            role="tab"
                            id="tab-ai"
                            aria-selected={activeTab === 'ai'}
                            aria-controls="panel-ai"
                            onClick={() => setActiveTab('ai')}
                            className={clsx(
                                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:outline-none",
                                activeTab === 'ai'
                                    ? "bg-modal text-ink shadow-sm border border-border-base"
                                    : "text-muted hover:bg-surface-hover"
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
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border-base bg-modal/50 backdrop-blur-sm">
                        <h2 className="text-lg font-semibold text-ink">
                            {activeTab === 'general' ? 'General Settings' : 'AI Services'}
                        </h2>
                        <button
                            onClick={closeSettings}
                            aria-label="Close settings"
                            className="p-1.5 rounded-lg hover:bg-surface-hover text-muted transition-colors focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:outline-none"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'general' && (
                            <div
                                role="tabpanel"
                                id="panel-general"
                                aria-labelledby="tab-general"
                                className="space-y-6"
                            >
                                {/* Theme Toggle */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-ink">
                                            Appearance
                                        </div>
                                        <div className="text-xs text-muted mt-0.5">
                                            Switch between light and dark mode
                                        </div>
                                    </div>
                                    <button
                                        data-testid="theme-toggle"
                                        onClick={toggleTheme}
                                        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface text-ink hover:bg-surface-hover transition-colors focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:outline-none"
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
                                <div className="pt-4 border-t border-border-base">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-2 bg-surface rounded-lg text-muted">
                                            <Folder className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="text-sm font-medium text-ink">
                                                Storage Location
                                            </div>
                                            <div className="text-xs text-muted mt-1 break-all font-mono bg-surface p-2 rounded border border-border-base">
                                                {storagePath || 'Loading...'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div
                                role="tabpanel"
                                id="panel-ai"
                                aria-labelledby="tab-ai"
                                className="space-y-6"
                            >
                                {/* Provider Selector */}
                                <div>
                                    <label htmlFor="ai-provider" className="block text-sm font-medium text-muted mb-2">
                                        AI Provider
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        <select
                                            id="ai-provider"
                                            value={aiConfig.provider}
                                            onChange={(e) => handleProviderChange(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-surface border border-border-base text-ink focus:outline-none focus:ring-2 focus:ring-border-focus"
                                        >
                                            {PROVIDERS.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="mt-1.5 text-xs text-muted">
                                        Select the AI provider you want to use for inline generation.
                                    </p>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-border-base">
                                    {/* Base URL */}
                                    <div>
                                        <label htmlFor="ai-base-url" className="flex items-center gap-2 text-sm font-medium text-muted mb-1.5">
                                            <Server className="w-3.5 h-3.5" />
                                            Base URL
                                        </label>
                                        <input
                                            id="ai-base-url"
                                            type="text"
                                            value={aiConfig.baseUrl}
                                            onChange={(e) => updateAiConfig('baseUrl', e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-surface border border-border-base text-ink placeholder-subtle focus:outline-none focus:ring-2 focus:ring-border-focus font-mono text-sm"
                                            placeholder="https://api.openai.com/v1"
                                        />
                                    </div>

                                    {/* API Key */}
                                    <div>
                                        <label htmlFor="ai-api-key" className="flex items-center gap-2 text-sm font-medium text-muted mb-1.5">
                                            <Key className="w-3.5 h-3.5" />
                                            API Key
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="ai-api-key"
                                                type={showApiKey ? "text" : "password"}
                                                value={aiConfig.apiKey}
                                                onChange={(e) => updateAiConfig('apiKey', e.target.value)}
                                                className="w-full pl-3 pr-10 py-2 rounded-lg bg-surface border border-border-base text-ink placeholder-subtle focus:outline-none focus:ring-2 focus:ring-border-focus font-mono text-sm"
                                                placeholder="sk-..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                aria-label={showApiKey ? "Hide API key" : "Show API key"}
                                                title={showApiKey ? "Hide API key" : "Show API key"}
                                                className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-muted hover:text-ink transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:outline-none rounded-r-lg"
                                            >
                                                {showApiKey ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                        <p className="mt-1.5 text-xs text-muted">
                                            Your key is stored locally in <code>.dialog/config.json</code>.
                                        </p>
                                    </div>

                                    {/* Model */}
                                    <div>
                                        <label htmlFor="ai-model" className="flex items-center gap-2 text-sm font-medium text-muted mb-1.5">
                                            <Hash className="w-3.5 h-3.5" />
                                            Model Name
                                        </label>
                                        <input
                                            id="ai-model"
                                            type="text"
                                            value={aiConfig.model}
                                            onChange={(e) => updateAiConfig('model', e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-surface border border-border-base text-ink placeholder-subtle focus:outline-none focus:ring-2 focus:ring-border-focus font-mono text-sm"
                                            placeholder="gpt-4o"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-border-base bg-surface/50">
                        <div className="text-xs text-muted text-center">
                            Dialog v0.1.0-alpha
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
