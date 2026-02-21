import { useRef, useState, useEffect } from "react";
import { Plus, Trash2, Zap, Calendar, List, Sparkles, History, Play, Pause, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';
import { saveToLocalStorage, getFromLocalStorage } from '../utils/localStorage';
import { aiEngine } from '../utils/aiEngine';
import { useLanguage } from '../App';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './addtask.css';
import './addtask.css';

function Addtask({ Todos, setTodos, onTaskComplete }) {
  Todos = Array.isArray(Todos) ? Todos : [];
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSystem, setSelectedSystem] = useState(() => getFromLocalStorage("selectedSystem", "short"));
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isOrderDirty, setIsOrderDirty] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const inputRef = useRef();
  const durationRef = useRef();
  const totalHoursRef = useRef();
  const dateRef = useRef();
  const audio = useRef(null); // Just a placeholder if needed, or remove completely

  // Track total time elapsed today
  const [dayStartTime, setDayStartTime] = useState(() => {
    const saved = localStorage.getItem('dayStartTime');
    return saved ? new Date(saved) : new Date();
  });

  // Track locked days
  const [lockedDays, setLockedDays] = useState(() => {
    const saved = localStorage.getItem('lockedDays');
    return saved ? JSON.parse(saved) : [];
  });

  // ✅ FIX 1: interval dependency + prevent duplicate locked days
  useEffect(() => {
    const interval = setInterval(() => {
      setTodos(prevTodos => {
        if (!Array.isArray(prevTodos)) return [];
        const now = new Date();
        const hoursElapsed = (now - dayStartTime) / (1000 * 60 * 60);

        if (hoursElapsed >= 12) {
          const hasActiveTasks = prevTodos.some(todo => !todo.completed);

          if (!hasActiveTasks) {
            const previousDay = new Date(dayStartTime).toISOString().split('T')[0];

            if (!lockedDays.includes(previousDay)) {
              const newLockedDays = [...lockedDays, previousDay];
              setLockedDays(newLockedDays);
              localStorage.setItem('lockedDays', JSON.stringify(newLockedDays));
            }

            const newDayStart = new Date();
            setDayStartTime(newDayStart);
            localStorage.setItem('dayStartTime', newDayStart.toISOString());

            const completedTasks = prevTodos.filter(todo => todo.completed);
            const currentHistory = getFromLocalStorage('history', []);

            const historyWithPreviousDay = [
              ...completedTasks.map(task => ({
                ...task,
                completedAt: new Date().toISOString(),
                date: previousDay
              })),
              ...currentHistory
            ];

            saveToLocalStorage('history', historyWithPreviousDay);

            return [];
          }
        }

        return prevTodos.map(todo => {
          if (todo.isRunning && todo.timeLeft > 0) {
            return { ...todo, timeLeft: todo.timeLeft - 1 };
          }
          return todo;
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [setTodos, dayStartTime, lockedDays]);

  useEffect(() => {
    const completedTaskIndex = Todos.findIndex(todo => todo.isRunning && todo.timeLeft === 0);
    if (completedTaskIndex !== -1) {
      const task = Todos[completedTaskIndex];
      const currentHistory = getFromLocalStorage('history', []);
      const historyItem = {
        ...task,
        completed: true,
        isRunning: false,
        timeLeft: task.duration,
        completedAt: new Date().toISOString()
      };
      saveToLocalStorage('history', [historyItem, ...currentHistory]);
      if (onTaskComplete) onTaskComplete(task.text);
      setTodos(prev => {
        const newTodos = [...prev];
        newTodos[completedTaskIndex] = {
          ...newTodos[completedTaskIndex],
          isRunning: false,
          completed: true,
          timeLeft: task.duration
        };
        return newTodos;
      });
    }
  }, [Todos, onTaskComplete, setTodos]);

  useEffect(() => {
    saveToLocalStorage("selectedSystem", selectedSystem);
  }, [selectedSystem]);

  const HandleAdd = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const text = inputRef.current.value?.trim();
    if (!text) return;

    const date = dateRef.current.value || new Date().toISOString().split('T')[0];

    // Ensure we're working with current day
    const today = new Date().toISOString().split('T')[0];

    // Check if trying to add to a locked day
    if (lockedDays.includes(date)) {
      alert('This day is locked. You can only delete tasks from locked days.');
      return;
    }

    if (selectedSystem === "short" || selectedSystem === "long") {
      const hours = parseFloat(totalHoursRef.current?.value);
      if (hours && hours > 0) {
        const totalMins = hours * 60;
        const workTime = selectedSystem === "short" ? 25 : 45;
        const breakTime = selectedSystem === "short" ? 5 : 15;
        const cycleTime = workTime + breakTime;
        const count = Math.floor(totalMins / cycleTime);
        const cycles = count < 1 ? 1 : count;
        const groupId = Date.now().toString();
        const groupTitle = `${text} (${hours}${lang === 'en' ? 'h' : ' س'})`;

        const newTasks = [];
        for (let i = 0; i < cycles; i++) {
          newTasks.push({
            text: `${text} (${lang === 'en' ? 'Part' : 'جزء'} ${i + 1})`,
            completed: false,
            duration: workTime * 60,
            timeLeft: workTime * 60,
            system: selectedSystem,
            isRunning: false,
            stopped: false,
            date: today,
            type: 'work',
            groupId: groupId,
            groupTitle: groupTitle
          });
          newTasks.push({
            text: `${lang === 'en' ? 'Rest Break' : 'استراحة'} (${i + 1})`,
            completed: false,
            duration: breakTime * 60,
            timeLeft: breakTime * 60,
            system: selectedSystem,
            isRunning: false,
            stopped: false,
            date: today,
            type: 'rest',
            groupId: groupId,
            groupTitle: groupTitle
          });
        }
        // Filter out tasks from locked days when adding new ones
        const nonLockedTasks = Todos.filter(todo => !lockedDays.includes(todo.date));
        setTodos([...newTasks, ...nonLockedTasks]);
      }
    } else {
      const duration = parseInt(durationRef.current?.value) || 0;
      const newTodo = {
        text,
        completed: false,
        duration: duration * 60,
        timeLeft: duration * 60,
        system: selectedSystem,
        isRunning: false,
        stopped: false,
        date: today
      };
      // Filter out tasks from locked days when adding new ones
      const nonLockedTasks = Todos.filter(todo => !lockedDays.includes(todo.date));
      setTodos([newTodo, ...nonLockedTasks]);
    }

    inputRef.current.value = "";
    if (durationRef.current) durationRef.current.value = "";
    if (totalHoursRef.current) totalHoursRef.current.value = "";
  };

  const HandleDelete = (index) => {
    const newTodos = [...Todos];
    newTodos.splice(index, 1);
    setTodos(newTodos);
  };

  const ToggleTimer = (index) => {
    setTodos(prev => prev.map((todo, i) => {
      if (i === index) {
        return { ...todo, isRunning: !todo.isRunning, stopped: todo.isRunning };
      }
      return { ...todo, isRunning: false };
    }));
  };

  const HandleSystemChange = (e) => setSelectedSystem(e.target.value);

  const HandleAiSplit = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const text = inputRef.current.value?.trim();
    if (!text) {
      alert(t('ai.invalidInput'));
      return;
    }

    setIsAiLoading(true);
    try {
      const date = dateRef.current.value || new Date().toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      // Check if the selected date is locked
      if (lockedDays.includes(today)) {
        alert(lang === 'en' ?
          'This day is locked. You can only delete tasks from locked days.' :
          'هذا اليوم مقفل. يمكنك فقط حذف المهام من الأيام المقفلة.');
        setIsAiLoading(false);
        return;
      }

      // Send input directly to AI without validation
      console.log('Sending text to AI:', text);

      const subtasks = await aiEngine.splitProject(text, lang);

      // Handle fallback response when API quota exceeded
      if (Array.isArray(subtasks)) {
        // This is a fallback response, not an error
      } else if (subtasks && subtasks.error) {
        alert(subtasks.error);
        setIsAiLoading(false);
        return;
      } else if (!subtasks || !Array.isArray(subtasks) || subtasks.length === 0) {
        alert(lang === 'en' ?
          'AI could not understand this task. Please try rephrasing it more clearly.' :
          'الذكاء الاصطناعي لم يستطع فهم هذه المهمة. من فضلك حاول إعادة صياغتها بشكل أوضح.');
        setIsAiLoading(false);
        return;
      }

      const groupId = Date.now().toString();
      const newTasks = subtasks.map((st, idx) => ({
        text: st.text?.trim() || `${lang === 'en' ? 'Subtask' : 'مهمة فرعية'} ${idx + 1}`,
        completed: false,
        duration: (st.duration && typeof st.duration === 'number' && st.duration > 0) ? st.duration * 60 : 15 * 60,
        timeLeft: (st.duration && typeof st.duration === 'number' && st.duration > 0) ? st.duration * 60 : 15 * 60,
        system: 'custom',
        isRunning: false,
        stopped: false,
        date: today,
        groupId: groupId,
        groupTitle: text
      }));

      setTodos([...newTasks, ...Todos]);
      inputRef.current.value = "";
    } catch (err) {
      console.error('AI Split Error:', err);
      alert(lang === 'en' ?
        'AI analysis failed. Please check your input and try again.' :
        'فشل تحليل الذكاء الاصطناعي. من فضلك تحقق من المدخل وحاول مرة أخرى.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const HandleAiReorder = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (Todos.length < 2) return;
    setIsAiLoading(true);
    try {
      const response = await aiEngine.optimizeOrder(Todos, lang);

      // The backend returns { data: { indices: [], message: "" } }
      if (response?.data?.indices && Array.isArray(response.data.indices)) {
        const newIndices = response.data.indices;

        // Map original Todos to new order using indices
        // We filter out any invalid indices just in case
        const reordered = newIndices
          .map(index => Todos[index])
          .filter(todo => todo !== undefined);

        // If the AI didn't include all tasks, append the missing ones
        if (reordered.length < Todos.length) {
          const includedIndices = new Set(newIndices);
          const missing = Todos.filter((_, idx) => !includedIndices.has(idx));
          setTodos([...reordered, ...missing]);
        } else {
          setTodos(reordered);
        }

        setIsOrderDirty(false);
        if (response.data.message) {
          console.log("AI Strategy:", response.data.message);
        }
      } else if (response?.error) {
        alert(response.error);
      }
    } catch (err) {
      console.error('AI Reorder Error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const deleteGroup = (groupId) => {
    if (window.confirm(lang === 'en' ?
      'Are you sure you want to delete this entire group?' :
      'هل أنت متأكد من حذف هذه المجموعة بالكامل؟')) {

      // Remove all tasks in this group
      const groupTasks = taskGroups[groupId].tasks;
      const taskIndices = groupTasks.map(t => t.originalIndex);

      setTodos(prevTodos =>
        prevTodos.filter((_, index) => !taskIndices.includes(index))
      );

      // Remove from expanded groups
      setExpandedGroups(prev => {
        const newExpanded = { ...prev };
        delete newExpanded[groupId];
        return newExpanded;
      });
    }
  };

  // Group tasks by groupId
  const taskGroups = {};
  const standaloneTasks = [];

  Todos.forEach((todo, index) => {
    if (todo.groupId) {
      if (!taskGroups[todo.groupId]) {
        taskGroups[todo.groupId] = {
          id: todo.groupId,
          title: todo.groupTitle,
          tasks: []
        };
      }
      taskGroups[todo.groupId].tasks.push({ ...todo, originalIndex: index });
    } else {
      standaloneTasks.push({ ...todo, originalIndex: index });
    }
  });

  // Check if current selected date is locked
  const currentDate = dateRef.current?.value || new Date().toISOString().split('T')[0];
  const isCurrentDateLocked = lockedDays.includes(currentDate);

  return (
    <div className="addtask">
      <div className="task-upper-section">
        <div className="task-header">
          <h2><Zap className="icon-pulse" /> {t('home.tasks')}</h2>
          <div className="header-controls">
            {isCurrentDateLocked && (
              <span className="locked-indicator">🔒 Locked Day</span>
            )}
            <button onClick={() => {
              if (window.confirm(lang === 'en' ?
                'Are you sure you want to clear all tasks?' :
                'هل أنت متأكد من مسح جميع المهام؟')) {
                setTodos([]);
              }
            }} className="clear-all-btn">
              <Trash2 size={16} /> <span>{t('home.flushList')}</span>
            </button>
          </div>
        </div>

        <div className="controls">
          <div className="input-group main-input">
            <input
              type="text"
              ref={inputRef}
              placeholder={t('home.addTaskPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && HandleAdd()}
            />
          </div>

          <div className="input-row">
            <select value={selectedSystem} onChange={HandleSystemChange}>
              <option value="short">Short (25/5)</option>
              <option value="long">Long (45/15)</option>
              <option value="custom">Custom</option>
            </select>

            {(selectedSystem === "short" || selectedSystem === "long") ? (
              <input
                type="number"
                ref={totalHoursRef}
                placeholder={lang === 'en' ? 'Hours' : 'ساعات'}
                style={{ width: '80px' }}
              />
            ) : (
              <input
                type="number"
                ref={durationRef}
                placeholder={lang === 'en' ? 'Mins' : 'دقائق'}
                style={{ width: '80px' }}
              />
            )}

            <div className="date-wrapper">
              <Calendar size={16} className="date-icon" />
              <input
                type="date"
                ref={dateRef}
                defaultValue={new Date().toISOString().split('T')[0]}
                min={new Date().toISOString().split('T')[0]}
                className="date-input"
              />
            </div>
          </div>

          <div className="button-row">
            <button onClick={HandleAdd} className="primary-btn">
              <Plus size={18} /> {t('home.add')}
            </button>

            <button onClick={HandleAiSplit} className="ai-btn split-btn" disabled={isAiLoading}>
              <Sparkles size={18} /> {isAiLoading ? '...' : t('home.analyzeSubdivide')}
            </button>

            <button onClick={HandleAiReorder} className="ai-btn reorder-btn" disabled={isAiLoading || Todos.length < 2}>
              <Zap size={18} /> {isAiLoading ? '...' : t('home.optimizeOrder')}
            </button>
          </div>
        </div>
      </div>

      <div className="todo-list">
        {/* Render Groups */}
        {Object.values(taskGroups).map(group => {
          const isExpanded = expandedGroups[group.id];
          const completedCount = group.tasks.filter(t => t.completed).length;
          const totalCount = group.tasks.length;
          const progress = (completedCount / totalCount) * 100;

          return (
            <div key={group.id} className="task-group">
              <div className="group-header" onClick={() => toggleGroup(group.id)}>
                <div className="group-info">
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <span className="group-title">{group.title}</span>
                </div>
                <div className="group-meta">
                  <span className="group-progress">{completedCount}/{totalCount}</span>
                  <div className="group-progress-bar">
                    <div style={{ width: `${progress}%` }}></div>
                  </div>
                  <button
                    className="delete-group-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteGroup(group.id);
                    }}
                    title={lang === 'en' ? 'Delete Group' : 'حذف المجموعة'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="group-content">
                  {group.tasks.map(todo => (
                    <div key={todo.originalIndex} className={`todo-item small-item ${todo.completed ? 'completed' : ''} ${lockedDays.includes(todo.date) ? 'locked' : ''}`}>
                      <div className="task-main">
                        <div className={`status-dot small ${todo.type === 'rest' ? 'rest-dot' : ''}`}></div>
                        <span className="text">{todo.text} {lockedDays.includes(todo.date) && <span className="locked-badge">🔒</span>}</span>
                        {todo.completed && <CheckCircle size={14} className="status-icon done" />}
                      </div>
                      <div className="task-actions">
                        <span className={`todo-time small ${todo.stopped ? 'stopped' : ''}`}>
                          {(() => {
                            const hours = Math.floor(todo.timeLeft / 3600);
                            const minutes = Math.floor((todo.timeLeft % 3600) / 60);
                            const seconds = todo.timeLeft % 60;

                            if (hours > 0) {
                              return `${hours}h ${minutes}m`;
                            } else if (minutes > 0) {
                              if (seconds === 0) return `${minutes}m`;
                              return `${minutes}m ${seconds}s`;
                            } else {
                              return `${seconds}s`;
                            }
                          })()}
                        </span>
                        <button className="timer-btn small" onClick={() => ToggleTimer(todo.originalIndex)}>
                          {todo.isRunning ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                        <button className="delete-btn small" onClick={() => HandleDelete(todo.originalIndex)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Render Standalone Tasks */}
        {standaloneTasks.map(todo => (
          <div key={todo.originalIndex} className={`todo-item ${todo.completed ? 'completed' : ''} ${lockedDays.includes(todo.date) ? 'locked' : ''}`}>
            <div className="task-main">
              <div className="status-dot"></div>
              <span className="text">{todo.text} {lockedDays.includes(todo.date) && <span className="locked-badge">🔒</span>}</span>
              {todo.completed && <CheckCircle size={18} className="status-icon done" />}
            </div>

            <div className="task-actions">
              <span className={`todo-time ${todo.stopped ? 'stopped' : ''}`}>
                {(() => {
                  const hours = Math.floor(todo.timeLeft / 3600);
                  const minutes = Math.floor((todo.timeLeft % 3600) / 60);
                  const seconds = todo.timeLeft % 60;

                  if (hours > 0) {
                    return `${hours}h ${minutes}m`;
                  } else if (minutes > 0) {
                    if (seconds === 0) return `${minutes}m`;
                    return `${minutes}m ${seconds}s`;
                  } else {
                    return `${seconds}s`;
                  }
                })()}
              </span>

              <button className="timer-btn" onClick={() => ToggleTimer(todo.originalIndex)}>
                {todo.isRunning ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button className="delete-btn" onClick={() => HandleDelete(todo.originalIndex)}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Addtask;
