// ============================================================
// Ticket Detail Page — Full ticket view with interactions
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import OtpModal from '../components/OtpModal';
import FeedbackModal from '../components/FeedbackModal';
import FileUpload from '../components/FileUpload';
import {
    HiOutlineClock, HiOutlineUser, HiOutlineTag, HiOutlinePaperAirplane,
    HiOutlineDocument, HiOutlineLockClosed, HiOutlineStar, HiOutlineCube,
    HiOutlineArrowLeft, HiOutlinePencil,
} from 'react-icons/hi';

const TicketDetail = ({ showNotification }) => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const chatEndRef = useRef(null);

    const [ticket, setTicket] = useState(null);
    const [interactions, setInteractions] = useState([]);
    const [files, setFiles] = useState([]);
    const [items, setItems] = useState([]);
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(true);

    // Interaction form
    const [message, setMessage] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [sending, setSending] = useState(false);

    // File upload
    const [newFiles, setNewFiles] = useState([]);
    const [uploading, setUploading] = useState(false);

    // Status update
    const [newStatus, setNewStatus] = useState('');

    // Assignment
    const [teamMembers, setTeamMembers] = useState([]);
    const [assignTo, setAssignTo] = useState('');

    // Item form
    const [showItemForm, setShowItemForm] = useState(false);
    const [itemForm, setItemForm] = useState({ item_name: '', item_type: '', quantity: 1, serial_number: '', notes: '' });

    // Modals
    const [showOtp, setShowOtp] = useState(false);
    const [otpEmail, setOtpEmail] = useState('');
    const [showFeedback, setShowFeedback] = useState(false);

    const isTechOrAdmin = user?.role === 'technician' || user?.role === 'admin';

    useEffect(() => {
        fetchTicket();
        if (isTechOrAdmin) fetchTeamMembers();
    }, [id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [interactions]);

    const fetchTicket = async () => {
        try {
            const res = await API.get(`/tickets/${id}`);
            setTicket(res.data.ticket);
            setInteractions(res.data.interactions || []);
            setFiles(res.data.files || []);
            setItems(res.data.items || []);
            setFeedback(res.data.feedback);
        } catch (err) {
            showNotification('Failed to load ticket.', 'error');
            navigate('/tickets');
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamMembers = async () => {
        try {
            const res = await API.get('/technicians/team-members');
            setTeamMembers(res.data.members || []);
        } catch (err) { /* ignore */ }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        setSending(true);
        try {
            await API.post(`/tickets/${id}/interact`, { message, is_internal: isInternal });
            setMessage('');
            fetchTicket();
        } catch (err) {
            showNotification('Failed to send message.', 'error');
        } finally {
            setSending(false);
        }
    };

    const handleUploadFiles = async () => {
        if (newFiles.length === 0) return;
        setUploading(true);
        try {
            const fd = new FormData();
            newFiles.forEach((file) => fd.append('files', file));
            await API.post(`/tickets/${id}/upload`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setNewFiles([]);
            fetchTicket();
            showNotification('Files uploaded!');
        } catch (err) {
            showNotification('Failed to upload files.', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleStatusUpdate = async () => {
        if (!newStatus) return;
        try {
            await API.put(`/technicians/tickets/${id}/status`, { status: newStatus });
            setNewStatus('');
            fetchTicket();
            showNotification('Status updated!');
        } catch (err) {
            showNotification(err.response?.data?.error || 'Failed to update status.', 'error');
        }
    };

    const handleAssign = async () => {
        if (!assignTo) return;
        try {
            await API.put(`/technicians/tickets/${id}/assign`, { 
                assigned_to: assignTo === 'unassign' ? null : assignTo 
            });
            setAssignTo('');
            fetchTicket();
            showNotification('Ticket assignment updated!');
        } catch (err) {
            showNotification('Failed to update assignment.', 'error');
        }
    };

    const handleRequestClose = async () => {
        try {
            const res = await API.post(`/tickets/${id}/request-close`);
            setOtpEmail(res.data.email || '');
            setShowOtp(true);
            showNotification('Closure OTP sent!');
        } catch (err) {
            showNotification(err.response?.data?.error || 'Failed to send OTP.', 'error');
        }
    };

    const handleCloseWithOtp = async (otp) => {
        // Figure out the full email
        const actualEmail = ticket?.behalf_user_id
            ? ticket?.creator_email // or behalf user email — we need the actual
            : ticket?.creator_email;
        await API.post(`/tickets/${id}/close`, { otp, email: actualEmail });
        setShowOtp(false);
        fetchTicket();
        showNotification('Ticket closed successfully!');
    };

    const handleSubmitFeedback = async (rating, comment) => {
        await API.post(`/tickets/${id}/feedback`, { rating, comment });
        fetchTicket();
        showNotification('Feedback submitted!');
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            await API.post(`/tickets/${id}/items`, itemForm);
            setItemForm({ item_name: '', item_type: '', quantity: 1, serial_number: '', notes: '' });
            setShowItemForm(false);
            fetchTicket();
            showNotification('Item added!');
        } catch (err) {
            showNotification('Failed to add item.', 'error');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!ticket) return null;

    const isOpen = ticket.status !== 'closed';

    return (
        <div className="animate-fade-in">
            {/* Back button */}
            <button onClick={() => navigate('/tickets')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
                <HiOutlineArrowLeft className="w-4 h-4" /> Back to Tickets
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Ticket Header */}
                    <div className="glass-card p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <span className="text-xs font-mono text-primary-400">{ticket.ticket_number}</span>
                                <h1 className="text-xl font-bold text-gray-900 mt-1">{ticket.title}</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
                                <span className={`badge badge-${ticket.status}`}>{ticket.status?.replace('_', ' ')}</span>
                            </div>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{ticket.description}</p>

                        {/* Form data */}
                        {ticket.form_data && Object.keys(ticket.form_data).length > 0 && (
                            <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Additional Details</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(ticket.form_data).map(([key, val]) => (
                                        <div key={key}>
                                            <span className="text-xs text-gray-400">{key.replace(/_/g, ' ')}:</span>
                                            <span className="text-sm text-gray-600 ml-2">{String(val)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Interactions / Chat */}
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h2>
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {interactions.length > 0 ? interactions.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-3 animate-fade-in ${msg.is_internal ? 'opacity-70' : ''}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        {msg.user_name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-gray-700">{msg.user_name}</span>
                                            <span className="text-xs text-gray-400 capitalize">({msg.user_role})</span>
                                            {msg.is_internal && (
                                                <span className="badge bg-amber-500/20 text-amber-400 text-[10px]">
                                                    <HiOutlineLockClosed className="w-3 h-3 mr-0.5 inline" /> Internal
                                                </span>
                                            )}
                                            <span className="text-xs text-dark-600">{formatDate(msg.created_at)}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{msg.message}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-gray-400 text-center py-4">No messages yet.</p>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Send message */}
                        {isOpen && (
                            <form onSubmit={handleSendMessage} className="mt-4 pt-4 border-t border-gray-200">
                                {isTechOrAdmin && (
                                    <label className="flex items-center gap-2 mb-2 text-xs text-gray-500 cursor-pointer">
                                        <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="accent-amber-500 rounded" />
                                        Internal note (visible only to techs & admins)
                                    </label>
                                )}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="input-field flex-1"
                                    />
                                    <button type="submit" disabled={sending} className="btn-primary px-4">
                                        <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Files */}
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>
                        {files.length > 0 ? (
                            <div className="space-y-2 mb-4">
                                {files.map((f) => (
                                    <a
                                        key={f.id}
                                        href={`/uploads/${f.stored_name}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100/40 transition-colors"
                                    >
                                        <HiOutlineDocument className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm text-primary-400 hover:underline">{f.original_name}</span>
                                        <span className="text-xs text-dark-600 ml-auto">{f.uploaded_by_name}</span>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 mb-4">No files attached.</p>
                        )}

                        {isOpen && (
                            <>
                                <FileUpload files={newFiles} onChange={setNewFiles} />
                                {newFiles.length > 0 && (
                                    <button onClick={handleUploadFiles} disabled={uploading} className="btn-primary mt-3 text-sm">
                                        {uploading ? 'Uploading...' : 'Upload Files'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Items Provided/Replaced */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <HiOutlineCube className="w-5 h-5 text-gray-500" /> Items Provided / Replaced
                            </h2>
                            {isTechOrAdmin && isOpen && (
                                <button onClick={() => setShowItemForm(!showItemForm)} className="btn-secondary text-sm">
                                    + Add Item
                                </button>
                            )}
                        </div>

                        {showItemForm && (
                            <form onSubmit={handleAddItem} className="p-4 rounded-xl bg-gray-50 border border-gray-200 mb-4 space-y-3 animate-fade-in">
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="Item Name *" value={itemForm.item_name} onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })} className="input-field" required />
                                    <input type="text" placeholder="Item Type" value={itemForm.item_type} onChange={(e) => setItemForm({ ...itemForm, item_type: e.target.value })} className="input-field" />
                                    <input type="number" placeholder="Qty" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) })} className="input-field" min={1} />
                                    <input type="text" placeholder="Serial Number" value={itemForm.serial_number} onChange={(e) => setItemForm({ ...itemForm, serial_number: e.target.value })} className="input-field" />
                                </div>
                                <textarea placeholder="Notes" value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} className="input-field resize-none" rows={2} />
                                <div className="flex gap-2">
                                    <button type="submit" className="btn-primary text-sm">Save Item</button>
                                    <button type="button" onClick={() => setShowItemForm(false)} className="btn-secondary text-sm">Cancel</button>
                                </div>
                            </form>
                        )}

                        {items.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-400 text-xs uppercase border-b border-gray-200">
                                            <th className="text-left py-2 px-2">Item</th>
                                            <th className="text-left py-2 px-2">Type</th>
                                            <th className="text-center py-2 px-2">Qty</th>
                                            <th className="text-left py-2 px-2">Serial #</th>
                                            <th className="text-left py-2 px-2">By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
                                            <tr key={item.id} className="border-b border-dark-800/50">
                                                <td className="py-2 px-2 text-gray-700">{item.item_name}</td>
                                                <td className="py-2 px-2 text-gray-500">{item.item_type || '—'}</td>
                                                <td className="py-2 px-2 text-gray-600 text-center">{item.quantity}</td>
                                                <td className="py-2 px-2 text-gray-500 font-mono text-xs">{item.serial_number || '—'}</td>
                                                <td className="py-2 px-2 text-gray-400">{item.provided_by_name || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">No items logged.</p>
                        )}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Ticket Info */}
                    <div className="glass-card p-5">
                        <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase">Details</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <HiOutlineUser className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-500">Creator:</span>
                                <span className="text-gray-700">{ticket.creator_name}</span>
                            </div>
                            {ticket.created_on_behalf && ticket.behalf_user_name && (
                                <div className="flex items-center gap-2">
                                    <HiOutlineUser className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">On behalf of:</span>
                                    <span className="text-gray-700">{ticket.behalf_user_name}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <HiOutlineUser className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-500">Assigned to:</span>
                                <span className="text-gray-700">{ticket.assignee_name || 'Unassigned'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <HiOutlineTag className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-500">Category:</span>
                                <span className="text-gray-700">{ticket.category_name}</span>
                            </div>
                            {ticket.subcategory_name && (
                                <div className="flex items-center gap-2">
                                    <HiOutlineTag className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">Sub:</span>
                                    <span className="text-gray-700">{ticket.subcategory_name}</span>
                                </div>
                            )}
                            {ticket.team_name && (
                                <div className="flex items-center gap-2">
                                    <HiOutlineUser className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">Team:</span>
                                    <span className="text-gray-700">{ticket.team_name}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <HiOutlineClock className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-500">Created:</span>
                                <span className="text-gray-700">{formatDate(ticket.created_at)}</span>
                            </div>
                            {ticket.closed_at && (
                                <div className="flex items-center gap-2">
                                    <HiOutlineClock className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">Closed:</span>
                                    <span className="text-gray-700">{formatDate(ticket.closed_at)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions (Tech/Admin) */}
                    {isTechOrAdmin && isOpen && (
                        <div className="glass-card p-5 space-y-4">
                            <h3 className="text-sm font-semibold text-gray-600 uppercase">Actions</h3>

                            {/* Update Status */}
                            <div>
                                <label className="input-label">Update Status</label>
                                <div className="flex gap-2">
                                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input-field flex-1 text-sm">
                                        <option value="">Choose...</option>
                                        <option value="open">Open</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="with_user">With User</option>
                                        <option value="resolved">Resolved</option>
                                    </select>
                                    <button onClick={handleStatusUpdate} disabled={!newStatus} className="btn-primary text-sm px-3 disabled:opacity-30">
                                        <HiOutlinePencil className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Reassign */}
                            <div>
                                <label className="input-label">Reassign</label>
                                <div className="flex gap-2">
                                    <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="input-field flex-1 text-sm">
                                        <option value="">Choose technician...</option>
                                        <option value="unassign">Unassign Ticket</option>
                                        {teamMembers.map((m) => (
                                            <option key={m.id} value={m.id}>{m.name} ({m.team_name})</option>
                                        ))}
                                    </select>
                                    <button onClick={handleAssign} disabled={!assignTo} className="btn-primary text-sm px-3 disabled:opacity-30">Go</button>
                                </div>
                            </div>

                            {/* Close Ticket */}
                            <button onClick={handleRequestClose} className="btn-danger w-full text-sm">
                                Close Ticket (Send OTP)
                            </button>
                        </div>
                    )}

                    {/* Feedback */}
                    {ticket.status === 'closed' && (
                        <div className="glass-card p-5">
                            <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase flex items-center gap-2">
                                <HiOutlineStar className="w-4 h-4 text-amber-400" /> Feedback
                            </h3>
                            {feedback ? (
                                <div>
                                    <div className="flex gap-1 mb-2">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <HiOutlineStar key={s} className={`w-5 h-5 ${s <= feedback.rating ? 'text-amber-400 fill-amber-400' : 'text-dark-600'}`} />
                                        ))}
                                    </div>
                                    {feedback.comment && <p className="text-sm text-gray-500">{feedback.comment}</p>}
                                    <p className="text-xs text-dark-600 mt-2">— {feedback.user_name}</p>
                                </div>
                            ) : user?.role === 'user' ? (
                                <button onClick={() => setShowFeedback(true)} className="btn-primary w-full text-sm">
                                    Submit Feedback
                                </button>
                            ) : (
                                <p className="text-sm text-gray-400">No feedback yet.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <OtpModal
                isOpen={showOtp}
                onClose={() => setShowOtp(false)}
                onVerify={handleCloseWithOtp}
                onResend={handleRequestClose}
                email={otpEmail}
                title="Ticket Closure OTP"
            />
            <FeedbackModal
                isOpen={showFeedback}
                onClose={() => setShowFeedback(false)}
                onSubmit={handleSubmitFeedback}
            />
        </div>
    );
};

export default TicketDetail;
