import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../App';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, ArrowRight, ArrowLeft } from 'lucide-react';
import './auth.css';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const { lang, t } = useLanguage();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (res.ok) {
                login(data.token, data.user);
                navigate('/');
            } else {
                setError(data.error || 'Authentication failed');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page fade-in">
            <div className="auth-card glass-card">
                <div className="auth-header">
                    <div className="auth-icon-wrapper">
                        {isLogin ? <LogIn size={32} /> : <UserPlus size={32} />}
                    </div>
                    <h2>{isLogin ? t('auth.loginTitle') || 'Performance Login' : t('auth.registerTitle') || 'Create Account'}</h2>
                    <p>{isLogin ? t('auth.loginSub') || 'Access your execution workspace' : t('auth.registerSub') || 'Join the elite performance suite'}</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <div className="input-field">
                            <UserIcon size={18} className="field-icon" />
                            <input
                                type="text"
                                placeholder={t('auth.username') || 'Username'}
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>
                    )}
                    <div className="input-field">
                        <Mail size={18} className="field-icon" />
                        <input
                            type="email"
                            placeholder={t('auth.email') || 'Email Address'}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="input-field">
                        <Lock size={18} className="field-icon" />
                        <input
                            type="password"
                            placeholder={t('auth.password') || 'Password'}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="auth-submit-btn ai-btn" disabled={loading}>
                        {loading ? '...' : (isLogin ? t('auth.loginBtn') || 'Login' : t('auth.registerBtn') || 'Register')}
                        {lang === 'ar' ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                    </button>
                </form>

                <div className="auth-footer">
                    <span>{isLogin ? t('auth.noAccount') || "Don't have an account?" : t('auth.hasAccount') || "Already have an account?"}</span>
                    <button onClick={() => setIsLogin(!isLogin)} className="toggle-auth-btn">
                        {isLogin ? t('auth.switchToRegister') || 'Register Now' : t('auth.switchToLogin') || 'Login Now'}
                    </button>
                </div>
            </div>
        </div>
    );
}
