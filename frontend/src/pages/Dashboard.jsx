// ============================================================
// Dashboard Page — Role-based dashboard with stats
// ============================================================
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import TicketCard from '../components/TicketCard';
import {
    HiOutlineTicket, HiOutlineClock, HiOutlineCheckCircle,
    HiOutlineExclamation, HiOutlineStar, HiOutlineTrendingUp,
} from 'react-icons/hi';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentTickets, setRecentTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, ticketsRes] = await Promise.all([
                    API.get('/admin/dashboard'),
                    API.get('/tickets', { params: { limit: 5 } }),
                ]);
                setStats(statsRes.data.stats);
                setRecentTickets(ticketsRes.data.tickets);
            } catch (err) {
                console.error('Dashboard error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    let statCards = [
        { label: 'Total Tickets', value: stats?.total_tickets || 0, icon: HiOutlineTicket, color: 'primary' },
        { label: 'Open', value: stats?.open_tickets || 0, icon: HiOutlineExclamation, color: 'blue' },
        { label: 'In Progress', value: stats?.in_progress_tickets || 0, icon: HiOutlineClock, color: 'amber' },
        { label: 'Closed', value: stats?.closed_tickets || 0, icon: HiOutlineCheckCircle, color: 'emerald' },
    ];

    if (user?.role === 'admin' || user?.role === 'technician') {
        statCards.push(
            { label: 'Avg Resolution (hrs)', value: stats?.avg_resolution_hours || '—', icon: HiOutlineTrendingUp, color: 'purple' },
            { label: 'Avg Rating', value: stats?.avg_feedback_rating || '—', icon: HiOutlineStar, color: 'amber' }
        );
    }

    const colorMap = {
        primary: { bg: 'bg-primary-500/10', text: 'text-primary-400', border: 'border-primary-500/20' },
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">
                    Welcome back, <span className="text-primary-400">{user?.name}</span>
                </p>
            </div>

            {/* Stats Grid */}
            <div className={`grid grid-cols-2 md:grid-cols-4 ${statCards.length > 4 ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} gap-4 mb-8`}>
                {statCards.map((stat, index) => {
                    const colors = colorMap[stat.color];
                    return (
                        <div
                            key={stat.label}
                            className={`glass-card p-4 border ${colors.border} hover:scale-[1.02] transition-transform`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center mb-3`}>
                                <stat.icon className={`w-5 h-5 ${colors.text}`} />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Recent Tickets + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Tickets */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Tickets</h2>
                        <Link to="/tickets" className="text-sm text-primary-400 hover:text-primary-300">View All →</Link>
                    </div>
                    <div className="space-y-3">
                        {recentTickets.length > 0 ? (
                            recentTickets.map((ticket) => (
                                <TicketCard key={ticket.id} ticket={ticket} />
                            ))
                        ) : (
                            <div className="glass-card p-8 text-center">
                                <HiOutlineTicket className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                                <p className="text-gray-500">No tickets yet</p>
                                <Link to="/tickets/new" className="btn-primary inline-block mt-4 text-sm">
                                    Create Your First Ticket
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions (Sidebar) */}
                <div className="space-y-6">
                    <div className="glass-card p-5">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                        <div className="space-y-3">
                        <Link
                            to="/tickets/new"
                            className="block glass-card p-4 hover:bg-gray-100/40 transition-all group border border-primary-500/10"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                    <HiOutlineTicket className="w-5 h-5 text-primary-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">New Ticket</p>
                                    <p className="text-xs text-gray-400">Raise a support request</p>
                                </div>
                            </div>
                        </Link>

                        <Link
                            to="/tickets"
                            className="block glass-card p-4 hover:bg-gray-100/40 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <HiOutlineClock className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">My Tickets</p>
                                    <p className="text-xs text-gray-400">View & track your tickets</p>
                                </div>
                            </div>
                        </Link>

                        {(user?.role === 'admin' || user?.role === 'technician') && (
                            <Link
                                to="/reports"
                                className="block glass-card p-4 hover:bg-gray-100/40 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                        <HiOutlineTrendingUp className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Reports</p>
                                        <p className="text-xs text-gray-400">View analytics & metrics</p>
                                    </div>
                                </div>
                            </Link>
                        )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
