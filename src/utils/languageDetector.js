/**
 * Language detector utility
 * Detects language from text input
 */
export const languageDetector = {
    /**
     * Detect language from text
     * @param {string} text - The text to analyze
     * @returns {string} - Language code ('ar' for Arabic, 'en' for English)
     */
    detect(text) {
        if (!text || typeof text !== 'string') return 'en';
        
        const trimmedText = text.trim();
        if (trimmedText.length === 0) return 'en';
        
        // Check for Arabic characters
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        
        // Count Arabic vs English characters
        let arabicCount = 0;
        let englishCount = 0;
        let totalLetters = 0;
        
        for (let char of trimmedText) {
            if (arabicRegex.test(char)) {
                arabicCount++;
                totalLetters++;
            } else if (/[a-zA-Z]/.test(char)) {
                englishCount++;
                totalLetters++;
            }
        }
        
        // If no letters found, default to English
        if (totalLetters === 0) return 'en';
        
        // Calculate percentages
        const arabicPercent = (arabicCount / totalLetters) * 100;
        const englishPercent = (englishCount / totalLetters) * 100;
        
        // If text contains Arabic characters
        if (arabicCount > 0) {
            // If Arabic percentage is high (more than 60%), it's Arabic
            if (arabicPercent > 60) {
                return 'ar';
            }
            // If Arabic percentage is significant (more than 40%) and more than English
            if (arabicPercent > 40 && arabicPercent > englishPercent) {
                return 'ar';
            }
            // If text starts with Arabic word, give it more weight
            const firstWord = trimmedText.split(/\s+/)[0];
            if (arabicRegex.test(firstWord) && arabicPercent > 30) {
                return 'ar';
            }
        }
        
        // Default to English
        return 'en';
    },
    
    /**
     * Get language name from code
     * @param {string} langCode - Language code
     * @returns {string} - Language name
     */
    getLanguageName(langCode) {
        const languages = {
            'en': 'English',
            'ar': 'العربية'
        };
        return languages[langCode] || 'English';
    }
};