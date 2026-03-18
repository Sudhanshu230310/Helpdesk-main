// ============================================================
// Sidebar Navigation Component — Light Theme
// ============================================================
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    HiOutlineViewGrid, HiOutlineTicket, HiOutlinePlusCircle,
    HiOutlineChartBar, HiOutlineCog, HiOutlineSupport
} from 'react-icons/hi';
import iitrprLogo from '../assets/iitrprlogo.png';


const Sidebar = ({ isOpen }) => {
    const { user } = useAuth();

    const menuItems = [
        { path: '/dashboard', icon: HiOutlineViewGrid, label: 'Dashboard' },
        { path: '/tickets', icon: HiOutlineTicket, label: 'Tickets' },
        { path: '/tickets/new', icon: HiOutlinePlusCircle, label: 'New Ticket' },
    ];

    // Technician & Admin items
    if (user?.role === 'admin' || user?.role === 'technician') {
        menuItems.push({ path: '/reports', icon: HiOutlineChartBar, label: 'Reports' });
    }

    // Admin-only items
    if (user?.role === 'admin') {
        menuItems.push({ path: '/admin', icon: HiOutlineCog, label: 'Admin Panel' });
    }

    return (
        <aside
            className={`fixed top-0 left-0 h-full z-40 bg-white border-r border-gray-200
        transition-all duration-300 flex flex-col
        ${isOpen ? 'w-64' : 'w-16'}`}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-200">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
                    <img src={iitrprLogo} alt='logo' className="w-8 h-8 object-contain" />
                </div>
                {isOpen && (
                    <div className="animate-fade-in">
                        <h1 className="text-lg font-bold text-gray-900 tracking-tight">Helpdesk</h1>
                        <p className="text-[10px] text-gray-400 -mt-0.5">Support System</p>
                    </div>
                )}
            </div>

            {/* Menu */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
              ${isActive
                                ? 'bg-primary-50 text-primary-600 shadow-sm'
                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {isOpen && (
                            <span className="text-sm font-medium animate-fade-in">{item.label}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom: role badge */}
            {isOpen && (
                <div className="px-4 py-3 border-t border-gray-200">
                    <div className="px-3 py-2 rounded-xl bg-gray-50">
                        <p className="text-xs text-gray-400">Logged in as</p>
                        <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
                        <span className="inline-block mt-1 badge badge-open text-[10px] capitalize">{user?.role}</span>
                    </div>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
