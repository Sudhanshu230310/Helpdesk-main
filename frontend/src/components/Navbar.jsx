// ============================================================
// Navbar Component — Light Theme
// ============================================================
import { useAuth } from '../context/AuthContext';
import { HiOutlineMenuAlt2, HiOutlineBell, HiOutlineLogout } from 'react-icons/hi';

const Navbar = ({ onToggleSidebar }) => {
    const { user, logout } = useAuth();

    return (
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200">
            <div className="flex items-center justify-between px-6 py-3">
                {/* Left: Hamburger */}
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <HiOutlineMenuAlt2 className="w-5 h-5" />
                </button>

                {/* Right: User info */}
                <div className="flex items-center gap-4">
                    {/* Notification bell */}
                    <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                        <HiOutlineBell className="w-5 h-5" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
                    </button>

                    {/* User badge */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                        </div>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={logout}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Logout"
                    >
                        <HiOutlineLogout className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
