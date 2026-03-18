// ============================================================
// Ticket List Page — Filterable ticket table
// ============================================================
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import TicketCard from '../components/TicketCard';
import { HiOutlineSearch, HiOutlineFilter, HiOutlinePlusCircle, HiOutlineTicket } from 'react-icons/hi';

const TicketList = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    const [filters, setFilters] = useState({
        search: '',
        status: '',
        category_id: '',
        page: 1,
    });

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await API.get('/tickets/categories');
                setCategories(res.data.categories || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchTickets();
    }, [filters.page, filters.status, filters.category_id]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const params = { limit: 10 };
            if (filters.search) params.search = filters.search;
            if (filters.status) params.status = filters.status;
            if (filters.category_id) params.category_id = filters.category_id;
            params.page = filters.page;

            const res = await API.get('/tickets', { params });
            setTickets(res.data.tickets || []);
            setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
        } catch (err) {
            console.error('Failed to fetch tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setFilters((prev) => ({ ...prev, page: 1 }));
        fetchTickets();
    };

    const handleFilterChange = (name, value) => {
        setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
    };

    const clearFilters = () => {
        setFilters({ search: '', status: '', category_id: '', page: 1 });
    };

    const statuses = ['open', 'in_progress', 'with_user', 'resolved', 'closed'];

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
                    <p className="text-gray-500 mt-1">{pagination.total} total tickets</p>
                </div>
                <Link to="/tickets/new" className="btn-primary flex items-center gap-2">
                    <HiOutlinePlusCircle className="w-5 h-5" /> New Ticket
                </Link>
            </div>

            {/* Search & Filters */}
            <div className="glass-card p-4 mb-6">
                <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="flex-1 relative">
                        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                            placeholder="Search tickets by title or number..."
                            className="input-field pl-10"
                        />
                    </div>
                    <button type="submit" className="btn-primary">Search</button>
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-secondary flex items-center gap-2 ${showFilters ? 'ring-2 ring-primary-500/50' : ''}`}
                    >
                        <HiOutlineFilter className="w-4 h-4" /> Filters
                    </button>
                </form>

                {/* Expandable filters */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="input-label">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="input-field"
                                >
                                    <option value="">All Statuses</option>
                                    {statuses.map((s) => (
                                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Category</label>
                                <select
                                    value={filters.category_id}
                                    onChange={(e) => handleFilterChange('category_id', e.target.value)}
                                    className="input-field"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button onClick={clearFilters} className="btn-secondary w-full">
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Ticket List */}
            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : tickets.length > 0 ? (
                <>
                    <div className="space-y-3">
                        {tickets.map((ticket) => (
                            <TicketCard key={ticket.id} ticket={ticket} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            <button
                                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                                disabled={pagination.page <= 1}
                                className="btn-secondary text-sm disabled:opacity-30"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-500">
                                Page {pagination.page} of {pagination.pages}
                            </span>
                            <button
                                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                                disabled={pagination.page >= pagination.pages}
                                className="btn-secondary text-sm disabled:opacity-30"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="glass-card p-12 text-center">
                    <HiOutlineTicket className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No tickets found</h3>
                    <p className="text-gray-400 mb-4">
                        {filters.search || filters.status || filters.category_id
                            ? 'Try adjusting your filters.'
                            : 'Create your first ticket to get started.'}
                    </p>
                    <Link to="/tickets/new" className="btn-primary inline-flex items-center gap-2">
                        <HiOutlinePlusCircle className="w-5 h-5" /> Create Ticket
                    </Link>
                </div>
            )}
        </div>
    );
};

export default TicketList;
