// ============================================================
// Login Page
// ============================================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OtpModal from '../components/OtpModal';
import { HiOutlineSupport, HiOutlineMail, HiOutlineLockClosed, HiOutlineServer } from 'react-icons/hi';
import iitrprLogo from '../assets/iitrprlogo.png';

const Login = ({ showNotification }) => {
    const { login, ldapLogin, verifyOtp, resendOtp } = useAuth();
    const navigate = useNavigate();

    const [isLdap, setIsLdap] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showOtp, setShowOtp] = useState(false);
    const [otpEmail, setOtpEmail] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLdap) {
                await ldapLogin(email, password);
                showNotification('Login successful!');
            } else {
                await login(email, password);
                showNotification('Login successful!');
            }
            navigate('/dashboard');
        } catch (error) {
            const data = error.response?.data;
            if (data?.requiresVerification) {
                setOtpEmail(email);
                setShowOtp(true);
                showNotification('Please verify your email first.', 'error');
            } else {
                showNotification(data?.error || 'Login failed.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOtpVerify = async (otp) => {
        await verifyOtp(otpEmail, otp);
        setShowOtp(false);
        showNotification('Email verified! Please login again.');
    };

    return (
        <div className="min-h-screen flex">
            {/* Left — Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 items-center justify-center p-12">
                <div className="max-w-md">
                    <div className="w-24 h-24 rounded-2xl bg-primary-600/30 flex items-center justify-center mb-8 animate-pulse-glow">
                        <img src={iitrprLogo} alt='logo' className="w-24 h-24 object-contain" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
                        Helpdesk Support<br />
                        <span className="text-white">IIT ROPAR</span>
                    </h1>
                    <p className="text-primary-100 text-lg leading-relaxed">
                        Streamline your IT support — raise tickets, track progress, and get solutions faster.
                    </p>

                </div>
            </div>

            {/* Right — Login Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="lg:hidden w-12 h-12 rounded-xl bg-primary-600/30 flex items-center justify-center mx-auto mb-4">
                            <HiOutlineSupport className="w-6 h-6 text-primary-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                        <p className="text-gray-500 mt-1">Sign in to your account</p>
                    </div>

                    {/* Login type toggle */}
                    <div className="flex gap-1 p-1 bg-gray-50 rounded-xl mb-6">
                        <button
                            onClick={() => setIsLdap(false)}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all
                ${!isLdap ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Email Login
                        </button>
                        <button
                            onClick={() => setIsLdap(true)}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5
                ${isLdap ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <HiOutlineServer className="w-4 h-4" /> LDAP
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="input-label">
                                <HiOutlineMail className="inline w-4 h-4 mr-1" />
                                {isLdap ? 'LDAP Username / Email' : 'Email Address'}
                            </label>
                            <input
                                type={isLdap ? 'text' : 'email'}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder={isLdap ? 'username@domain.com' : 'you@example.com'}
                                required
                            />
                        </div>

                        <div>
                            <label className="input-label">
                                <HiOutlineLockClosed className="inline w-4 h-4 mr-1" />
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                `Sign In${isLdap ? ' with LDAP' : ''}`
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-400 mt-6">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
                            Register here
                        </Link>
                    </p>

                    {/* Demo credentials */}
                    <div className="mt-8 p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Demo Credentials:</p>
                        <div className="space-y-1 text-xs text-gray-400">
                            <p><span className="text-gray-500">Admin:</span> admin@helpdesk.com</p>
                            <p><span className="text-gray-500">Tech:</span> rahul.sharma@helpdesk.com</p>
                            <p><span className="text-gray-500">User:</span> sneha.gupta@example.com</p>
                            <p><span className="text-gray-500">Password:</span> password123</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* OTP Modal */}
            <OtpModal
                isOpen={showOtp}
                onClose={() => setShowOtp(false)}
                onVerify={handleOtpVerify}
                onResend={() => resendOtp(otpEmail)}
                email={otpEmail}
            />
        </div>
    );
};

export default Login;
