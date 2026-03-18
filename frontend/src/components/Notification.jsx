// ============================================================
// Notification Toast Component
// ============================================================
import { HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineX } from 'react-icons/hi';

const Notification = ({ notification, onClose }) => {
    if (!notification) return null;

    const isError = notification.type === 'error';

    return (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
            <div
                className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-md
          ${isError
                        ? 'bg-red-900/80 border-red-700/50 text-red-200'
                        : 'bg-emerald-900/80 border-emerald-700/50 text-emerald-200'
                    }`}
            >
                {isError ? (
                    <HiOutlineExclamationCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                ) : (
                    <HiOutlineCheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                )}
                <span className="text-sm font-medium">{notification.message}</span>
                <button onClick={onClose} className="ml-2 hover:opacity-70">
                    <HiOutlineX className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default Notification;
