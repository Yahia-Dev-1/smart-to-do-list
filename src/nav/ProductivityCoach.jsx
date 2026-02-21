import React, { useState, useEffect } from 'react';
import { aiEngine } from '../utils/aiEngine';
import { getFromLocalStorage } from '../utils/localStorage';
import { useLanguage } from '../App';
import { useAuth } from '../context/AuthContext';

export default function ProductivityCoach({ currentTasks }) {
    const [coachData, setCoachData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { lang, t } = useLanguage();
    const { user } = useAuth();

    useEffect(() => {
        const fetchCoachMessage = async () => {
            setIsLoading(true);
            try {
                const historyKey = user ? `history_${user.username}` : 'history_guest';
                const history = getFromLocalStorage(historyKey, []);
                const result = await aiEngine.getCoachMessage(history, currentTasks, lang);
                if (result?.data) {
                    setCoachData(result.data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCoachMessage();
    }, [currentTasks.length, lang]);

    if (isLoading) return (
        <div className="metric-card ai-coach-card glass-card">
            <div className="loading-spinner"></div>
        </div>
    );

    return (
        <div className="metric-card ai-coach-card enterprise-audit professional-suite">
            <div className="coach-header">
                <div className="header-main">
                    <div className="title-stack">
                        <h3>{t('coach.title')}</h3>
                        <span className="subtitle">{t('coach.subtitle')}</span>
                    </div>
                </div>
                {coachData?.statusColor && (
                    <div className="status-indicator">
                        <span className="dot" style={{ background: coachData.statusColor }}></span>
                        <span className="status-text">{coachData.focusScore > 70 ? t('coach.optimal') : coachData.focusScore > 40 ? t('coach.stable') : t('coach.subOptimal')}</span>
                    </div>
                )}
            </div>

            <div className="audit-grid">
                <div className="metrics-linear-column">
                    <div className="linear-metric">
                        <div className="m-header">
                            <span className="m-label">{t('coach.focusIntensity')}</span>
                            <span className="m-value">{coachData?.focusScore || 0}%</span>
                        </div>
                        <div className="m-bar-bg">
                            <div className="m-bar-fill indigo" style={{ width: `${coachData?.focusScore || 0}%` }}></div>
                        </div>
                    </div>
                    <div className="linear-metric">
                        <div className="m-header">
                            <span className="m-label">{t('coach.executionBalance')}</span>
                            <span className="m-value">{coachData?.balanceScore || 0}%</span>
                        </div>
                        <div className="m-bar-bg">
                            <div className="m-bar-fill slate" style={{ width: `${coachData?.balanceScore || 0}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="data-points-column">
                    <div className="data-point">
                        <span className="dp-label">{t('coach.velocity')}</span>
                        <span className="dp-value">{coachData?.velocity || 0.0} <small>{lang === 'en' ? 'tnd/day' : 'مهمة/يوم'}</small></span>
                    </div>
                    <div className="data-point">
                        <span className="dp-label">{t('coach.primarySector')}</span>
                        <span className="dp-value">{coachData?.topCategory || (lang === 'en' ? "Discovery" : "استكشاف")}</span>
                    </div>
                </div>
            </div>

            <div className="audit-insight-box">
                <div className="audit-content">
                    <p className="audit-message">{coachData?.message || t('coach.aggregating')}</p>
                    {coachData?.proTip && (
                        <div className="strategic-audit-tip">
                            <strong>{t('coach.strategicRecommendation')}</strong>
                            <p>{coachData.proTip}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
