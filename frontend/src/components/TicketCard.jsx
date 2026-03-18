// ============================================================
// TicketCard — Compact ticket display for lists
// ============================================================
import { Link } from 'react-router-dom';
import { HiOutlineClock, HiOutlineUser } from 'react-icons/hi';

const TicketCard = ({ ticket }) => {
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <Link
            to={`/tickets/${ticket.id}`}
            className="block glass-card-light p-4 hover:bg-gray-100/40 transition-all duration-200 group"
        >
            <div className="flex items-start justify-between gap-3">
                {/* Left */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-primary-400">{ticket.ticket_number}</span>
                        <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate transition-colors">
                        {ticket.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        {ticket.category_name && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100">{ticket.category_name}</span>
                        )}
                        {ticket.team_name && (
                            <span>{ticket.team_name}</span>
                        )}
                    </div>
                </div>

                {/* Right */}
                <div className="text-right flex-shrink-0">
                    <span className={`badge badge-${ticket.status} mb-2`}>
                        {ticket.status?.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-400 justify-end">
                        <HiOutlineClock className="w-3.5 h-3.5" />
                        <span>{formatDate(ticket.created_at)}</span>
                    </div>
                    {ticket.assignee_name && (
                        <div className="flex items-center gap-1 text-xs text-gray-400 justify-end mt-1">
                            <HiOutlineUser className="w-3.5 h-3.5" />
                            <span>{ticket.assignee_name}</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default TicketCard;
