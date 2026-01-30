import { invoke } from '@tauri-apps/api/core';
import { getAppConfigPath, getStorageDirPath } from './workspace';

/**
 * Application configuration interface.
 * Stores app-level settings, similar to Obsidian's app.json.
 */
export interface DialogConfig {
    /** Visual appearance settings. */
    theme: 'light' | 'dark';

    /** Optional accent color for the theme. */
    accentColor?: string;

    /** Editor-specific settings. */
    editor: {
        fontSize: number;
        lineHeight: number;
        spellcheck: boolean;
    };

    /** Auto-save interval in milliseconds. */
    autoSaveInterval: number;

    /** AI provider configuration. */
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
 * Gets the path to the configuration file in the execution directory.
 *
 * @returns {Promise<string>} The absolute path to the config file.
 */
async function getConfigPath(): Promise<string> {
    return getAppConfigPath();
}

/**
 * Writes the configuration to a file directly without triggering load loops.
 *
 * @param config The configuration object to write.
 * @returns {Promise<void>} A promise that resolves when the file is written.
 */
async function writeConfigToFile(config: DialogConfig): Promise<void> {
    const configPath = await getConfigPath();
    await invoke('write_json', {
        path: configPath,
        content: JSON.stringify(config, null, 2)
    });
}

/**
 * Loads the configuration from the .dialog.json file.
 * Returns cached configuration if available. If the file is missing or invalid,
 * it returns default configuration and attempts to persist it.
 *
 * @returns {Promise<DialogConfig>} The loaded configuration.
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
    } catch (error) {
        console.log('[Config] Config not found or failed to load, using defaults:', error);
        configCache = { ...DEFAULT_CONFIG };

        try {
            // Try to create/save the default file
            // Use internal helper to avoid recursion
            await writeConfigToFile(configCache!);
        } catch (writeError) {
            console.warn('[Config] Failed to persist default config (using in-memory):', writeError);
        }

        return configCache!;
    }
}

/**
 * Saves the configuration to the .dialog.json file.
 * Updates the cache and writes to disk.
 *
 * @param config Partial configuration updates to apply.
 * @returns {Promise<void>} A promise that resolves when the config is saved.
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
 * Retrieves a specific configuration value.
 *
 * @param key The configuration key to retrieve.
 * @returns {Promise<DialogConfig[K]>} The value associated with the key.
 */
export async function getConfigValue<K extends keyof DialogConfig>(
    key: K
): Promise<DialogConfig[K]> {
    const config = await loadConfig();
    return config[key];
}

/**
 * Sets a specific configuration value.
 *
 * @param key The configuration key to update.
 * @param value The new value for the key.
 * @returns {Promise<void>} A promise that resolves when the value is updated.
 */
export async function setConfigValue<K extends keyof DialogConfig>(
    key: K,
    value: DialogConfig[K]
): Promise<void> {
    await saveConfig({ [key]: value });
}

/**
 * Gets the storage directory path (.dialog folder in execution directory).
 *
 * @returns {Promise<string>} The absolute path to the storage directory.
 */
export async function getStorageDir(): Promise<string> {
    return getStorageDirPath();
}
