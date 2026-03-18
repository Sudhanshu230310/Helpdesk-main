// ============================================================
// OTP Modal — For registration & ticket closure verification
// ============================================================
import { useState } from 'react';
import { HiOutlineShieldCheck, HiOutlineX } from 'react-icons/hi';

const OtpModal = ({ isOpen, onClose, onVerify, onResend, email, title = 'OTP Verification' }) => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleChange = (index, value) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(''));
        }
    };

    const handleSubmit = async () => {
        const code = otp.join('');
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit OTP.');
            return;
        }

        setLoading(true);
        try {
            await onVerify(code);
            setOtp(['', '', '', '', '', '']);
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            await onResend();
            setError('');
        } catch (err) {
            setError('Failed to resend OTP.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-card p-8 w-full max-w-md animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
                            <HiOutlineShieldCheck className="w-5 h-5 text-primary-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                        <HiOutlineX className="w-5 h-5" />
                    </button>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-500 mb-6">
                    Enter the 6-digit OTP sent to <span className="text-primary-400 font-medium">{email}</span>
                </p>

                {/* OTP Inputs */}
                <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            id={`otp-${index}`}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className="w-12 h-14 text-center text-xl font-bold bg-white border border-gray-300
                rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/50
                focus:border-primary-500/50 transition-all"
                            autoFocus={index === 0}
                        />
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <p className="text-sm text-red-400 text-center mb-4">{error}</p>
                )}

                {/* Verify Button */}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn-primary w-full mb-4 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        'Verify OTP'
                    )}
                </button>

                {/* Resend */}
                <p className="text-center text-sm text-gray-400">
                    Didn't receive the code?{' '}
                    <button onClick={handleResend} className="text-primary-400 hover:text-primary-300 font-medium">
                        Resend OTP
                    </button>
                </p>
            </div>
        </div>
    );
};

export default OtpModal;
