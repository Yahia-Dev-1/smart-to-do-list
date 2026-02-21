import React, { useState } from 'react';
import CalendarLib from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './calendar.css';
import { useLanguage } from '../App';

export default function Calendar({ Todos, setTodos }) {
  const { lang, t } = useLanguage();
  const [value, onChange] = useState(new Date());

  // ✅ تأكد إن Todos دايمًا array
  Todos = Array.isArray(Todos) ? Todos : [];

  // Helper to get YYYY-MM-DD in local time
  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filter tasks for the selected date
  const selectedDateStr = getLocalDateString(value);
  const tasksForDate = Todos.filter(t => t.date === selectedDateStr);

  const handleDelete = (taskToDelete) => {
    const newTodos = Todos.filter(t => t !== taskToDelete);
    setTodos(newTodos);
  };

  // Tile content to show dots or indicators
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = getLocalDateString(date);
      const hasTask = Todos.some(t => t.date === dateStr);
      if (hasTask) {
        return <div className="dot"></div>;
      }
    }
    return null;
  };

  return (
    <div className='calendar-container reveal'>
      <h2>{t('calendar.title')}</h2>
      <CalendarLib
        onChange={onChange}
        value={value}
        tileContent={tileContent}
        locale={lang === 'ar' ? 'ar-EG' : 'en-US'}
      />

      <div className="tasks-for-date">
        <h3>{t('calendar.tasksFor')} {selectedDateStr}</h3>
        <ul>
          {tasksForDate.length > 0 ? (
            tasksForDate.map((t, idx) => (
              <li key={idx} className={t.completed ? 'completed' : ''}>
                <span>{t.text} {t.completed && '✔'}</span>
                <button
                  className="calendar-delete-btn"
                  onClick={() => handleDelete(t)}
                  title={lang === 'en' ? "Delete Task" : "حذف المهمة"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </li>
            ))
          ) : (
            <p className="no-tasks">{t('calendar.noTasks')}</p>
          )}
        </ul>
      </div>
    </div>
  )
}