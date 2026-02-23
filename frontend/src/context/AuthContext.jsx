import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore session from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        const savedRole = localStorage.getItem('role');

        if (savedToken && savedUser && savedRole) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
            setRole(savedRole);
        }
        setLoading(false);
    }, []);

    const login = async (email, password, captchaToken = '') => {
        const res = await API.post('/auth/login', { email, password, captchaToken });
        const { token: t, user: u, role: r } = res.data;

        setToken(t);
        setUser(u);
        setRole(r);

        localStorage.setItem('token', t);
        localStorage.setItem('user', JSON.stringify(u));
        localStorage.setItem('role', r);

        return { user: u, role: r };
    };

    const register = async (data) => {
        const res = await API.post('/auth/register', data);
        const { token: t, user: u, role: r } = res.data;

        setToken(t);
        setUser(u);
        setRole(r);

        localStorage.setItem('token', t);
        localStorage.setItem('user', JSON.stringify(u));
        localStorage.setItem('role', r);

        return { user: u, role: r };
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setRole(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
    };

    const updateUser = (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const value = {
        user,
        role,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!token,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
