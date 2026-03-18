// ============================================================
// Auth Context — Manage authentication state
// ============================================================
import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch user on mount
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await API.get('/auth/me');
                setUser(response.data.user);
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    // Login with email/password
    const login = async (email, password) => {
        const response = await API.post('/auth/login', { email, password });
        setUser(response.data.user);
        return response.data.user;
    };

    // LDAP login
    const ldapLogin = async (username, password) => {
        const response = await API.post('/auth/ldap-login', { username, password });
        setUser(response.data.user);
        return response.data.user;
    };

    // Register
    const register = async (data) => {
        const response = await API.post('/auth/register', data);
        return response.data;
    };

    // Verify OTP
    const verifyOtp = async (email, otp) => {
        const response = await API.post('/auth/verify-otp', { email, otp });
        return response.data;
    };

    // Resend OTP
    const resendOtp = async (email, purpose = 'registration') => {
        const response = await API.post('/auth/resend-otp', { email, purpose });
        return response.data;
    };

    // Logout
    const logout = async () => {
        try {
            await API.post('/auth/logout');
        } catch (err) {}
        setUser(null);
    };

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        login,
        ldapLogin,
        register,
        verifyOtp,
        resendOtp,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
