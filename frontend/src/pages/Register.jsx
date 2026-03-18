// ============================================================
// Register Page — User registration with OTP verification
// ============================================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OtpModal from '../components/OtpModal';
import { HiOutlineSupport, HiOutlineUserAdd } from 'react-icons/hi';

const Register = ({ showNotification }) => {
    const { register, verifyOtp, resendOtp } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '', email: '', password: '', confirmPassword: '',
        phone: '', department: '',
    });
    const [loading, setLoading] = useState(false);
    const [showOtp, setShowOtp] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (form.password !== form.confirmPassword) {
            showNotification('Passwords do not match.', 'error');
            return;
        }
        if (form.password.length < 6) {
            showNotification('Password must be at least 6 characters.', 'error');
            return;
        }

        setLoading(true);
        try {
            await register({
                name: form.name,
                email: form.email,
                password: form.password,
                phone: form.phone,
                department: form.department,
            });
            setShowOtp(true);
            showNotification('Registration successful! Please verify your email.');
        } catch (error) {
            showNotification(error.response?.data?.error || 'Registration failed.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpVerify = async (otp) => {
        await verifyOtp(form.email, otp);
        setShowOtp(false);
        showNotification('Email verified! You can now login.');
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-8">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-primary-600/30 flex items-center justify-center mx-auto mb-4">
                        <HiOutlineSupport className="w-6 h-6 text-primary-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
                    <p className="text-gray-500 mt-1">Register to start raising support tickets</p>
                </div>

                <div className="glass-card p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">Full Name *</label>
                                <input
                                    type="text" name="name" value={form.name}
                                    onChange={handleChange} className="input-field"
                                    placeholder="John Doe" required
                                />
                            </div>
                            <div>
                                <label className="input-label">Email Address *</label>
                                <input
                                    type="email" name="email" value={form.email}
                                    onChange={handleChange} className="input-field"
                                    placeholder="you@example.com" required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">Password *</label>
                                <input
                                    type="password" name="password" value={form.password}
                                    onChange={handleChange} className="input-field"
                                    placeholder="Min 6 characters" required
                                />
                            </div>
                            <div>
                                <label className="input-label">Confirm Password *</label>
                                <input
                                    type="password" name="confirmPassword" value={form.confirmPassword}
                                    onChange={handleChange} className="input-field"
                                    placeholder="Repeat password" required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">Phone</label>
                                <input
                                    type="tel" name="phone" value={form.phone}
                                    onChange={handleChange} className="input-field"
                                    placeholder="9876543210"
                                />
                            </div>
                            <div>
                                <label className="input-label">Department</label>
                                <input
                                    type="text" name="department" value={form.department}
                                    onChange={handleChange} className="input-field"
                                    placeholder="e.g., Finance, HR"
                                />
                            </div>
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <><HiOutlineUserAdd className="w-5 h-5" /> Register</>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-gray-400 mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
                        Sign In
                    </Link>
                </p>
            </div>

            {/* OTP Modal */}
            <OtpModal
                isOpen={showOtp}
                onClose={() => setShowOtp(false)}
                onVerify={handleOtpVerify}
                onResend={() => resendOtp(form.email)}
                email={form.email}
                title="Verify Your Email"
            />
        </div>
    );
};

export default Register;
