// ============================================
// I18N HELPER - Shared translation function
// ============================================

/**
 * Translate a key using the global i18n instance
 * @param {string} key - Translation key
 * @param {...*} args - Arguments for placeholders {0}, {1}, etc.
 * @returns {string} Translated text
 */
export function t(key, ...args) {
    if (typeof window !== 'undefined' && window.i18n) {
        return window.i18n.t(key, ...args);
    }
    // Fallback: return key with placeholders replaced
    if (args.length > 0) {
        return key.replace(/\{(\d+)\}/g, (match, index) => {
            return args[parseInt(index)] !== undefined ? args[parseInt(index)] : match;
        });
    }
    return key;
}
