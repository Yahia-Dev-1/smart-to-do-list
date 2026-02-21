import { useState, createContext, useEffect, useContext } from 'react';
import './index.css'
import Nav from './nav/nav.jsx'
import { BrowserRouter } from 'react-router-dom'
import { translations } from './utils/translations';
import { AuthProvider } from './context/AuthContext';

export const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

function App() {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (path) => {
    const keys = path.split('.');
    let result = translations[lang];
    for (const key of keys) {
      if (result[key]) result = result[key];
      else return path;
    }
    return result;
  };

  const toggleLang = () => setLang(prev => prev === 'en' ? 'ar' : 'en');

  return (
    <AuthProvider>
      <LanguageContext.Provider value={{ lang, toggleLang, t }}>
        <BrowserRouter>
          <div className="App reveal">
            <Nav />
          </div>
        </BrowserRouter>
      </LanguageContext.Provider>
    </AuthProvider>
  )
}

export default App
