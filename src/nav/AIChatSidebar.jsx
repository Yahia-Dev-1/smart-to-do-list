import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, User, MessageSquare, Globe } from 'lucide-react';
import { aiEngine } from '../utils/aiEngine';
import { languageDetector } from '../utils/languageDetector';
import './aichat.css';
import { useLanguage } from '../App';

export default function AIChatSidebar({ isOpen, onClose, currentTasks, history }) {
    const { lang, t } = useLanguage();
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('chat_messages');
        return saved ? JSON.parse(saved) : [
            { role: 'ai', text: t('chat.operational') }
        ];
    });

    useEffect(() => {
        if (messages.length === 1 && messages[0].role === 'ai') {
            setMessages(prev => {
                const newMsgs = [...prev];
                const cleanMsg = t('chat.operational');
                if (newMsgs[0].text !== cleanMsg) {
                    newMsgs[0].text = cleanMsg;
                }
                return newMsgs;
            });
        }
    }, [lang]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [detectedLang, setDetectedLang] = useState('en');
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
        localStorage.setItem('chat_messages', JSON.stringify(messages));
    }, [messages]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading) return;

        // Detect language from user input
        const userLang = languageDetector.detect(input);
        setDetectedLang(userLang);

        const userMsg = { 
            role: 'user', 
            text: input,
            lang: userLang // Store detected language with message
        };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            const result = await aiEngine.sendChatMessage(updatedMessages, currentTasks, history);
            if (result.error) throw new Error(result.error);
            const aiMsg = { 
                role: 'ai', 
                text: result.data,
                lang: userLang // AI responds in same language
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Chat Error:", error);
            const errorMsg = userLang === 'ar' 
                ? `خطأ في النظام: ${error.message}`
                : `System Error: ${error.message}`;
            setMessages(prev => [...prev, { 
                role: 'ai', 
                text: errorMsg,
                lang: userLang
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="ai-sidebar">
            <div className="sidebar-header">
                <h3><Bot size={20} /> {t('chat.title')}</h3>
                <button className="close-btn" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }} onClick={onClose}>
                    <X size={20} />
                </button>
            </div>

            <div className="chat-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                        <div className="message-bubble">
                            {msg.text}
                            {msg.lang && (
                                <div className="message-language">
                                    <Globe size={12} />
                                    <span>{languageDetector.getLanguageName(msg.lang)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="message ai">
                        <div className="message-bubble loading-bubble">
                            <div className="loading-dots">
                                <span></span><span></span><span></span>
                            </div>
                            <div className="message-language">
                                <Globe size={12} />
                                <span>{languageDetector.getLanguageName(detectedLang)}</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <form className="chat-input" onSubmit={handleSend}>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t('chat.placeholder')}
                />
                <button type="submit" disabled={isLoading || !input.trim()}>
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
