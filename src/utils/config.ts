import { invoke } from '@tauri-apps/api/core';
import { getAppConfigPath, getStorageDirPath } from './workspace';

/**
 * Application configuration - stores app-level settings
 * Similar to Obsidian's app.json
 */
export interface DialogConfig {
    // Appearance
    theme: 'light' | 'dark';
    accentColor?: string;

    // Editor settings
    editor: {
        fontSize: number;
        lineHeight: number;
        spellcheck: boolean;
    };

    // File settings
    autoSaveInterval: number; // in milliseconds

    // AI settings
    ai: {
        provider: 'openai' | 'gemini' | 'claude' | 'deepseek' | 'custom';
        baseUrl: string;
        apiKey: string;
        model: string;
    };
}

const DEFAULT_CONFIG: DialogConfig = {
    theme: 'light',
    editor: {
        fontSize: 16,
        lineHeight: 1.6,
        spellcheck: true,
    },
    autoSaveInterval: 1000,
    ai: {
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o',
    },
};

let configCache: DialogConfig | null = null;

/**
 * Get the path to the config file in the execution directory
 */
async function getConfigPath(): Promise<string> {
    return getAppConfigPath();
}

/**
 * Helper to write config to file directly without triggering load loops
 */
async function writeConfigToFile(config: DialogConfig): Promise<void> {
    const configPath = await getConfigPath();
    await invoke('write_json', {
        path: configPath,
        content: JSON.stringify(config, null, 2)
    });
}

/**
 * Load configuration from .dialog.json
 */
export async function loadConfig(): Promise<DialogConfig> {
    if (configCache) {
        return configCache;
    }

    try {
        const configPath = await getConfigPath();
        const content = await invoke<string>('read_json', { path: configPath });
        const parsed = JSON.parse(content);
        configCache = { ...DEFAULT_CONFIG, ...parsed };
        return configCache!;
    } catch {
        // Config file doesn't exist yet, return defaults AND create the file/folder
        console.log('[Config] Config not found, creating default...');
        configCache = { ...DEFAULT_CONFIG };
        // Use internal helper to avoid recursion
        await writeConfigToFile(configCache!);
        return configCache!;
    }
}

/**
 * Save configuration to .dialog.json
 */
export async function saveConfig(config: Partial<DialogConfig>): Promise<void> {
    // Ensure we have the current config loaded
    // If loadConfig fails (e.g. file error not handled), it might throw, but
    // our loadConfig handles "missing file" by creating defaults, so this should be safe.
    const currentConfig = await loadConfig();
    const newConfig = { ...currentConfig, ...config };
    configCache = newConfig;

    await writeConfigToFile(newConfig);
}

/**
 * Get a specific config value
 */
export async function getConfigValue<K extends keyof DialogConfig>(
    key: K
): Promise<DialogConfig[K]> {
    const config = await loadConfig();
    return config[key];
}

/**
 * Set a specific config value
 */
export async function setConfigValue<K extends keyof DialogConfig>(
    key: K,
    value: DialogConfig[K]
): Promise<void> {
    await saveConfig({ [key]: value });
}

/**
 * Get the storage directory path (.dialog folder in execution directory)
 */
export async function getStorageDir(): Promise<string> {
    return getStorageDirPath();
}
