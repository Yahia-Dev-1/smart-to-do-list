import { languageDetector } from './languageDetector.js';

const API_BASE_URL = "/api";

/**
 * AI Engine for handling all backend AI interactions
 */
export const aiEngine = {
    async splitProject(text, uiLang) {
        // Detect language from text, fallback to UI lang
        const lang = languageDetector.detect(text) || uiLang;
        // Store text for error handling
        const originalText = text;
        try {
            const response = await fetch(`${API_BASE_URL}/split`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, lang })
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Handle different error formats
            if (result.error) {
                throw new Error(result.error);
            }

            // Validate data structure
            // Handle both direct array response and {data: array} format
            const dataArray = result.data || (Array.isArray(result) ? result : null);
            if (!dataArray || !Array.isArray(dataArray)) {
                throw new Error('Invalid response format from AI');
            }

            return dataArray;
        } catch (error) {
            console.error("Split Error:", error);
            console.log("Error message:", error.message);
            console.log("Original text:", originalText);

            // Return structured error for better user feedback
            if (error.message.includes('nonsensical') || error.message.includes('Invalid Input') || error.message.includes('429')) {
                // Check if it might be valid non-English text or if API quota exceeded
                const mightBeValid = originalText && originalText.length > 1 && !/^[\W\d]+$/.test(originalText);

                if (error.message.includes('429')) {
                    // API quota exceeded - provide fallback response
                    return [
                        { text: `${originalText} - ${lang === 'en' ? 'Step 1' : 'الخطوة 1'}`, duration: 15 },
                        { text: `${originalText} - ${lang === 'en' ? 'Step 2' : 'الخطوة 2'}`, duration: 15 },
                        { text: `${originalText} - ${lang === 'en' ? 'Review' : 'مراجعة'}`, duration: 10 }
                    ];
                } else if (mightBeValid) {
                    // Let the AI try to process it anyway
                    return {
                        error: lang === 'en' ?
                            'AI could not understand this task. Please try rephrasing it more clearly.' :
                            'الذكاء الاصطناعي لم يستطع فهم هذه المهمة. من فضلك حاول إعادة صياغتها بشكل أوضح.'
                    };
                } else {
                    // Always let the AI try to process the input
                    return {
                        error: lang === 'en' ?
                            'AI could not understand this task. Please try rephrasing it more clearly.' :
                            'الذكاء الاصطناعي لم يستطع فهم هذه المهمة. من فضلك حاول إعادة صياغتها بشكل أوضح.'
                    };
                }
            }

            return {
                error: error.message || (lang === 'en' ?
                    'AI service temporarily unavailable. Please try again later.' :
                    'خدمة الذكاء الاصطناعي غير متوفرة مؤقتاً. من فضلك حاول مرة أخرى لاحقاً.')
            };

            return {
                error: lang === 'en' ?
                    'AI service temporarily unavailable. Please try again later.' :
                    'خدمة الذكاء الاصطناعي غير متوفرة مؤقتاً. من فضلك حاول مرة أخرى لاحقاً.'
            };
        }
    },

    async reorderTasks(tasks, uiLang) {
        try {
            const textToDetect = tasks.map(t => t.text).join(" ");
            const lang = languageDetector.detect(textToDetect) || uiLang;
            const response = await fetch(`${API_BASE_URL}/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tasks: tasks.map((t, i) => ({ id: i, text: t.text })), lang })
            });
            return await response.json();
        } catch (error) {
            console.error("Reorder Error:", error);
            return { error: "Could not connect to AI server." };
        }
    },

    async sendChatMessage(messages, currentTasks, history) {
        try {
            // Detect language from the last user message
            const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
            const detectedLang = lastUserMessage && lastUserMessage.text
                ? languageDetector.detect(lastUserMessage.text)
                : 'en';

            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages,
                    currentTasks,
                    history,
                    lang: detectedLang // Send detected language to backend
                })
            });
            return await response.json();
        } catch (error) {
            console.error("Chat Error:", error);
            return { error: "Could not connect to AI server." };
        }
    },

    async getCoachMessage(history, currentTasks, uiLang) {
        try {
            const textToDetect = (currentTasks || []).map(t => t.text).join(" ") + " " + (history || []).map(h => h.text).join(" ");
            const lang = languageDetector.detect(textToDetect) || uiLang;
            const response = await fetch(`${API_BASE_URL}/coach`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history, currentTasks, lang })
            });
            return await response.json();
        } catch (error) {
            console.error("Coach Error:", error);
            return { error: "Could not connect to AI server." };
        }
    },

    async optimizeOrder(tasks, uiLang) {
        try {
            const textToDetect = tasks.map(t => t.text).join(" ");
            const lang = languageDetector.detect(textToDetect) || uiLang;
            const response = await fetch(`${API_BASE_URL}/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tasks: tasks.map((t, i) => ({ id: i, text: t.text })), lang })
            });
            return await response.json();
        } catch (error) {
            console.error("Optimize Order Error:", error);
            return { error: "Could not connect to AI server." };
        }
    }
};