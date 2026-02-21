import React, { useState, useEffect, useRef } from 'react'
import './home.css'
import Productivity from '../body/productivity.jsx'
import Addtask from '../body/Addtask.jsx'
import Calendar from '../body/calendar.jsx'
import { saveToLocalStorage, getFromLocalStorage } from '../utils/localStorage';
import alarmSound from '../body/alarm.mp3';
import { requestNotificationPermission, sendNotification } from '../utils/notifications';
import { useLanguage } from '../App';

export default function Home() {
  const { lang, t } = useLanguage();
  const [Todos, setTodos] = useState(() => {
    const saved = getFromLocalStorage("todos", []);
    return Array.isArray(saved) ? saved : [];
  });
  const [productivityCount, setProductivityCount] = useState(0);
  const [activeAlert, setActiveAlert] = useState(null);
  const audioRef = useRef(new Audio(alarmSound));

  useEffect(() => {
    saveToLocalStorage("todos", Todos);
  }, [Todos]);

  const updateProductivity = () => {
    const history = getFromLocalStorage('history', []);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = history.filter(t => t.date === todayStr || t.completedAt?.startsWith(todayStr)).length;
    setProductivityCount(todayCount);
  };

  const onTaskComplete = (taskText) => {
    updateProductivity();
    if (taskText) {
      setActiveAlert(taskText);
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.error("Audio play failed:", err));
    }
  };

  const closeAlert = () => {
    setActiveAlert(null);
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  };

  useEffect(() => {
    updateProductivity();
    const checkAndNotify = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayTasks = Todos.filter(t => t.date === todayStr && !t.completed).length;
      if (todayTasks > 0) {
        const granted = await requestNotificationPermission();
        if (granted) {
          sendNotification(t('home.pendingTasks'), t('home.pendingTasksMsg')(todayTasks));
        }
      }
    };
    setTimeout(checkAndNotify, 2000);
  }, []);

  return (
    <div className='home'>
      <div className="productivity-wrapper">
        <Productivity count={productivityCount} />
      </div>

      <div className="main-content">
        <div className="addtask-wrapper">
          <Addtask Todos={Todos} setTodos={setTodos} onTaskComplete={onTaskComplete} />
        </div>
        <div className="calendar-wrapper">
          <Calendar Todos={Todos} setTodos={setTodos} />
        </div>
      </div>

      {activeAlert && (
        <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
          <div>
            <p>{t('home.executionConfirmed')(activeAlert)}</p>
            <div className="actions">
              <button onClick={closeAlert}>{t('home.acknowledge')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
