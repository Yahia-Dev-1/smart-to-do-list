import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, LayoutDashboard, Bot, Globe, Menu, X, LogOut, User as UserIcon } from 'lucide-react';
import Home from './home.jsx';
import Dashboard from './MyDashboard.jsx';
import Auth from './Auth.jsx';
import AIChatSidebar from './AIChatSidebar';
import { getFromLocalStorage } from '../utils/localStorage';
import { useLanguage } from '../App';
import { useAuth } from '../context/AuthContext';
import './nav.css';

export default function Nav() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [todos, setTodos] = useState([]);
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { lang, toggleLang, t } = useLanguage();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  // Close menu when clicking overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeMenu();
    }
  };

  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem('todos') || '[]');
    const storedHistory = getFromLocalStorage('history', []);
    setTodos(storedTodos);
    setHistory(storedHistory);
  }, [isChatOpen]);

  return (
    <div className="nav-wrapper">
      <nav className="navbar reveal">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <h1>Smart To-Do</h1>
        </div>

        <button className="menu-toggle" onClick={toggleMenu}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Overlay */}
        <div 
          className={`nav-overlay ${isMenuOpen ? 'active' : ''}`}
          onClick={handleOverlayClick}
        ></div>

        <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          <NavLink to="/" onClick={closeMenu} className={({ isActive }) => isActive ? 'active-link' : ''}>
            <HomeIcon size={16} />
            <span>{t('nav.home')}</span>
          </NavLink>
          <NavLink to="/dashboard" onClick={closeMenu} className={({ isActive }) => isActive ? 'active-link' : ''}>
            <LayoutDashboard size={16} />
            <span>{t('nav.dashboard')}</span>
          </NavLink>
          <button onClick={() => { setIsChatOpen(true); closeMenu(); }} className="ai-chat-trigger" title={t('nav.performanceConsultant')}>
            <Bot size={16} />
            <span>{t('nav.performanceConsultant')}</span>
          </button>
          <button onClick={() => { toggleLang(); closeMenu(); }} className="lang-toggle-btn">
            <Globe size={16} />
            <span>{t('nav.languageToggle')}</span>
          </button>

          {user ? (
            <div className="user-nav-actions">
              <div className="user-profile-mini">
                <UserIcon size={16} />
                <span>{user.username}</span>
              </div>
              <button onClick={() => { logout(); closeMenu(); }} className="logout-btn" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <NavLink to="/auth" onClick={closeMenu} className={({ isActive }) => isActive ? 'active-link' : ''}>
              <UserIcon size={16} />
              <span>{t('nav.login') || 'Login'}</span>
            </NavLink>
          )}
        </div>
      </nav>

      <AIChatSidebar
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentTasks={todos}
        history={history}
      />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </div>
  );
}
