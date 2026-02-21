import { useState, useEffect } from 'react';
import { useLanguage } from '../App';
import { getFromLocalStorage } from '../utils/localStorage';
import { CheckCircle, Clock, BarChart3, Trash2, List, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import './dashboard.css';

export default function Dashboard() {
    const { lang, t } = useLanguage();
    const [history, setHistory] = useState([]);
    const [currentTodos, setCurrentTodos] = useState([]);

    useEffect(() => {
        const storedHistory = getFromLocalStorage('history', []);
        setHistory(storedHistory);
        const storedTodos = JSON.parse(localStorage.getItem('todos') || '[]');
        setCurrentTodos(storedTodos);
    }, []);

    // Group history by date for daily productivity tracking
    const getDailyProductivity = () => {
        const dailyData = {};
        
        history.forEach(task => {
            const date = task.date || task.completedAt?.split('T')[0] || new Date().toISOString().split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = {
                    date: date,
                    count: 0,
                    focusMinutes: 0,
                    tasks: []
                };
            }
            dailyData[date].count += 1;
            dailyData[date].focusMinutes += (task.duration || 0) / 60;
            dailyData[date].tasks.push(task);
        });
        
        return Object.values(dailyData)
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 14); // Last 14 days
    };

    // Calculate improvement vs yesterday
    const getImprovementIndicator = () => {
        const dailyData = getDailyProductivity();
        if (dailyData.length < 2) return { trend: 'neutral', value: 0 };
        
        const today = dailyData[0]?.count || 0;
        const yesterday = dailyData[1]?.count || 0;
        
        if (today > yesterday) {
            return { trend: 'up', value: today - yesterday };
        } else if (today < yesterday) {
            return { trend: 'down', value: yesterday - today };
        } else {
            return { trend: 'neutral', value: 0 };
        }
    };

    const dailyProductivity = getDailyProductivity();
    const improvement = getImprovementIndicator();

    const handleDelete = (index) => {
        const newHistory = history.filter((_, idx) => idx !== index);
        setHistory(newHistory);
        localStorage.setItem('history', JSON.stringify(newHistory));
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const completedTodayCount = history.filter(t => t.date === todayStr).length;

    const totalFocusMinutes = history.reduce((acc, curr) => acc + (curr.duration / 60), 0);

    const formatFocusTime = (mins) => {
        const totalHours = Math.floor(mins / 60);
        const hours12 = totalHours % 12 || 12;
        const minutes = Math.floor(mins % 60);
        const period = totalHours >= 12 ? 'PM' : 'AM';
        
        if (lang === 'ar') {
            return totalHours > 0 ? `${totalHours} س ${minutes} د` : `${minutes} د`;
        }
        return totalHours > 0 ? `${hours12}:${minutes.toString().padStart(2, '0')} ${period}` : `${minutes}m`;
    };

    const totalCompleted = history.length;
    const shortCount = history.filter(t => t.system === 'short').length;
    const longCount = history.filter(t => t.system === 'long').length;
    const customCount = history.filter(t => t.system === 'custom').length;
    const getPct = (cnt) => totalCompleted === 0 ? 0 : Math.round((cnt / totalCompleted) * 100);

    const historyList = [...history].sort((a, b) => (b.completedAt || b.date).localeCompare(a.completedAt || a.date));

    // Get trend icon component
    const getTrendIcon = () => {
        switch (improvement.trend) {
            case 'up':
                return <TrendingUp size={20} color="#10b981" />;
            case 'down':
                return <TrendingDown size={20} color="#ef4444" />;
            default:
                return <Minus size={20} color="#64748b" />;
        }
    };

    // Format date for display
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return lang === 'en' ? 'Today' : 'اليوم';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return lang === 'en' ? 'Yesterday' : 'الأمس';
        } else {
            return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG', { 
                month: 'short', 
                day: 'numeric' 
            });
        }
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>{t('dashboard.title')}</h1>
                <p>{lang === 'en' ? 'Track your progress and focus metrics' : 'تتبع تقدمك ومقاييس تركيزك'}</p>
            </div>

            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-icon"><CheckCircle size={20} color="#3b82f6" /></div>
                    <h3>{t('dashboard.completedTasks')} ({lang === 'ar' ? 'اليوم' : 'Today'})</h3>
                    <div className="metric-value">{completedTodayCount}</div>
                    <div className="metric-sub">{lang === 'en' ? 'Tasks' : 'مهام'}</div>
                </div>
                <div className="metric-card improvement-card">
                    <div className="metric-icon">{getTrendIcon()}</div>
                    <h3>{lang === 'en' ? 'Improvement vs Yesterday' : 'التحسن عن الأمس'}</h3>
                    <div className="metric-value improvement-value">
                        <span className={`trend-indicator trend-${improvement.trend}`}>
                            {improvement.trend === 'up' ? '+' : improvement.trend === 'down' ? '-' : ''}
                            {improvement.value}
                        </span>
                    </div>
                    <div className="metric-sub">
                        {improvement.trend === 'up' ? (lang === 'en' ? 'tasks more' : 'مهام أكثر') : 
                         improvement.trend === 'down' ? (lang === 'en' ? 'tasks less' : 'مهام أقل') : 
                         (lang === 'en' ? 'no change' : 'لا تغيير')}
                    </div>
                </div>
                <div className="metric-card">
                    <div className="metric-icon"><Clock size={20} color="#8b5cf6" /></div>
                    <h3>{t('dashboard.focusTime')}</h3>
                    <div className="metric-value">{formatFocusTime(totalFocusMinutes)}</div>
                    <div className="metric-sub">{lang === 'en' ? 'Lifetime' : 'مدى الحياة'}</div>
                </div>
                <div className="metric-card">
                    <div className="metric-icon"><List size={20} color="#10b981" /></div>
                    <h3>{t('dashboard.completedTasks')} ({lang === 'ar' ? 'الإجمالي' : 'Total'})</h3>
                    <div className="metric-value">{totalCompleted}</div>
                    <div className="metric-sub">{lang === 'en' ? 'All time' : 'كل الوقت'}</div>
                </div>
            </div>

            <div className="distribution-section">
                <h2><BarChart3 size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> {lang === 'en' ? 'Task Breakdown' : 'تصنيف المهام'}</h2>
                <div className="progress-bars">
                    {[
                        { label: lang === 'en' ? 'Pomodoro (25m)' : 'بومودورو (25 د)', count: shortCount, color: '#3b82f6' },
                        { label: lang === 'en' ? 'Long Focus (45m)' : 'تركيز طويل (45 د)', count: longCount, color: '#8b5cf6' },
                        { label: lang === 'en' ? 'Custom Duration' : 'مدة مخصصة', count: customCount, color: '#10b981' }
                    ].map((item, id) => (
                        <div key={id} className="progress-item">
                            <div className="progress-label"><span>{item.label}</span><span>{getPct(item.count)}% ({item.count})</span></div>
                            <div className="progress-bg"><div className="progress-fill" style={{ width: `${getPct(item.count)}%`, background: item.color }} /></div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="daily-trend-section">
                <h2><BarChart3 size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> {lang === 'en' ? 'Daily Productivity Trend' : 'اتجاه الإنتاجية اليومية'}</h2>
                {dailyProductivity.length > 0 ? (
                    <div className="daily-trend-container">
                        <div className="daily-cards-grid">
                            {dailyProductivity.map((day, index) => (
                                <div key={day.date} className={`daily-card ${index === 0 ? 'today' : ''}`}>
                                    <div className="daily-header">
                                        <span className="daily-date">{formatDate(day.date)}</span>
                                        <span className="daily-count">{day.count} {lang === 'en' ? 'tasks' : 'مهام'}</span>
                                    </div>
                                    <div className="daily-stats">
                                        <div className="stat-item">
                                            <span className="stat-label">{lang === 'en' ? 'Focus' : 'التركيز'}</span>
                                            <span className="stat-value">
                                                {(() => {
                                                    const totalMinutes = Math.round(day.focusMinutes);
                                                    const hours12 = Math.floor(totalMinutes / 60) % 12 || 12;
                                                    const minutes = totalMinutes % 60;
                                                    const period = Math.floor(totalMinutes / 60) >= 12 ? 'PM' : 'AM';
                                                    return lang === 'en' 
                                                        ? `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
                                                        : `${totalMinutes}د`;
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="daily-progress">
                                        <div 
                                            className="daily-progress-bar"
                                            style={{
                                                width: `${Math.min((day.count / Math.max(...dailyProductivity.map(d => d.count))) * 100, 100)}%`,
                                                backgroundColor: index === 0 ? '#3b82f6' : '#64748b'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p style={{ color: '#64748b', textAlign: 'center' }}>{lang === 'en' ? 'No productivity data yet.' : 'لا توجد بيانات إنتاجية بعد.'}</p>
                )}
            </div>

            <div className="history-section">
                <h2>{lang === 'en' ? 'History' : 'السجل'}</h2>
                {historyList.length > 0 ? (
                    <div className="table-responsive">
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>{lang === 'en' ? 'Task' : 'المهمة'}</th>
                                    <th>{lang === 'en' ? 'Date' : 'التاريخ'}</th>
                                    <th>{lang === 'en' ? 'Type' : 'النوع'}</th>
                                    <th>{lang === 'en' ? 'Duration' : 'المدة'}</th>
                                    <th>{lang === 'en' ? 'Action' : 'إجراء'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyList.map((task, idx) => (
                                    <tr key={idx}>
                                        <td>{task.text}</td>
                                        <td>{task.date}</td>
                                        <td>{task.system === 'short' ? (lang === 'en' ? 'Pomodoro' : 'بومودورو') : (lang === 'en' ? task.system : 'مخصص')}</td>
                                        <td>
                                            {(() => {
                                                const totalMinutes = Math.floor(task.duration / 60);
                                                const hours12 = totalMinutes % 12 || 12;
                                                const minutes = task.duration % 60;
                                                const period = totalMinutes >= 12 ? 'PM' : 'AM';
                                                return lang === 'en' 
                                                    ? `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
                                                    : `${Math.floor(task.duration / 60)} د`;
                                            })()}
                                        </td>
                                        <td>
                                            <button onClick={() => handleDelete(idx)} className="delete-history-btn" title={lang === 'en' ? "Delete" : "حذف"}>
                                                <Trash2 size={16} color="#ef4444" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="no-history">{t('dashboard.noCompletedTasks')}</p>
                )}
            </div>
        </div>
    );
}
