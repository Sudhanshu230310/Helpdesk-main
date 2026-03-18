// ============================================================
// Ticket Creation Page — Dynamic forms, file upload, behalf
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import DynamicForm from '../components/DynamicForm';
import FileUpload from '../components/FileUpload';
import { HiOutlinePlusCircle, HiOutlineArrowLeft, HiOutlineTag } from 'react-icons/hi';

const TicketCreate = ({ showNotification }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        category_id: '',
        subcategory_id: '',
        priority: 'medium',
        on_behalf: false,
        behalf_user_email: '',
    });
    const [formData, setFormData] = useState({}); // dynamic form fields

    // Load categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await API.get('/tickets/categories');
                setCategories(res.data.categories || []);
            } catch (err) {
                console.error('Failed to load categories:', err);
            }
        };
        fetchCategories();
    }, []);

    // Update subcategories when category changes
    useEffect(() => {
        if (form.category_id) {
            const cat = categories.find((c) => c.id === parseInt(form.category_id));
            setSubcategories(cat?.subcategories || []);
        } else {
            setSubcategories([]);
        }
        setForm((prev) => ({ ...prev, subcategory_id: '' }));
        setFormData({});
    }, [form.category_id, categories]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleDynamicFieldChange = (fieldName, value) => {
        setFormData((prev) => ({ ...prev, [fieldName]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.description || !form.category_id) {
            showNotification('Please fill in title, description, and category.', 'error');
            return;
        }

        setLoading(true);
        try {
            // Create ticket
            const res = await API.post('/tickets', {
                ...form,
                category_id: parseInt(form.category_id),
                subcategory_id: form.subcategory_id ? parseInt(form.subcategory_id) : null,
                form_data: Object.keys(formData).length > 0 ? formData : null,
            });

            const ticketId = res.data.ticket.id;

            // Upload files if any
            if (files.length > 0) {
                const fd = new FormData();
                files.forEach((file) => fd.append('files', file));
                await API.post(`/tickets/${ticketId}/upload`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            showNotification(`Ticket ${res.data.ticket.ticket_number} created successfully!`);
            navigate(`/tickets/${ticketId}`);
        } catch (error) {
            showNotification(error.response?.data?.error || 'Failed to create ticket.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const isTechOrAdmin = user?.role === 'technician' || user?.role === 'admin';

    // View: Category Selection Grid
    if (!form.category_id) {
        return (
            <div className="max-w-4xl mx-auto animate-fade-in">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">What do you need help with?</h1>
                        <p className="text-gray-500 mt-1">Select a category below to create your ticket</p>
                    </div>
                    {(user?.role === 'admin') && (
                        <button onClick={() => navigate('/admin')} className="btn-secondary text-sm">
                            Manage Categories
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setForm(prev => ({ ...prev, category_id: cat.id }))}
                            className="glass-card p-6 text-left hover:scale-[1.03] hover:shadow-lg transition-all border border-transparent hover:border-primary-500/20 group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4 group-hover:bg-primary-500/20 transition-colors">
                                <HiOutlineTag className="w-6 h-6 text-primary-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{cat.name}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2">{cat.description || 'General support inquiries for this category'}</p>
                        </button>
                    ))}
                    {categories.length === 0 && !loading && (
                        <div className="col-span-full py-12 text-center text-gray-500 glass-card">
                            No categories found. Please contact an administrator.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const selectedCategory = categories.find(c => c.id === parseInt(form.category_id));

    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            <button onClick={() => setForm(prev => ({ ...prev, category_id: '' }))} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors w-fit">
                <HiOutlineArrowLeft className="w-4 h-4" /> Back to Categories
            </button>

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Create New Ticket</h1>
                <p className="text-gray-500 mt-1">
                    Category: <span className="font-medium text-primary-500">{selectedCategory?.name}</span>
                </p>
            </div>

            <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
                {/* On behalf toggle (for techs/admins) */}
                {isTechOrAdmin && (
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="on_behalf"
                                checked={form.on_behalf}
                                onChange={handleChange}
                                className="w-4 h-4 accent-primary-500 rounded"
                            />
                            <span className="text-sm text-gray-600">
                                Raise this ticket on behalf of a user
                            </span>
                        </label>
                        {form.on_behalf && (
                            <div className="mt-3 animate-fade-in">
                                <label className="input-label">User's Email *</label>
                                <input
                                    type="email"
                                    name="behalf_user_email"
                                    value={form.behalf_user_email}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="user@example.com"
                                    required={form.on_behalf}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Title */}
                <div>
                    <label className="input-label">Ticket Title *</label>
                    <input
                        type="text"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Brief summary of the issue"
                        required
                    />
                </div>

                {/* Subcategory */}
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="input-label">Topic / Subcategory</label>
                        <select
                            name="subcategory_id"
                            value={form.subcategory_id}
                            onChange={handleChange}
                            className="input-field"
                        >
                            <option value="">Select specific topic...</option>
                            {subcategories.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                    {sub.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Priority */}
                <div>
                    <label className="input-label">Priority</label>
                    <div className="flex gap-3 flex-wrap">
                        {['low', 'medium', 'high', 'critical'].map((p) => (
                            <label
                                key={p}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer border transition-all text-sm
                  ${form.priority === p
                                        ? `badge-${p} border-current`
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="priority"
                                    value={p}
                                    checked={form.priority === p}
                                    onChange={handleChange}
                                    className="hidden"
                                />
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="input-label">Description *</label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        className="input-field resize-none"
                        rows={4}
                        placeholder="Describe the issue in detail..."
                        required
                    />
                </div>

                {/* Dynamic Form Fields */}
                {form.subcategory_id && (
                    <DynamicForm
                        subcategoryId={parseInt(form.subcategory_id)}
                        formData={formData}
                        onChange={handleDynamicFieldChange}
                    />
                )}

                {/* File Upload */}
                <div>
                    <label className="input-label">Attachments</label>
                    <FileUpload files={files} onChange={setFiles} />
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary flex items-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><HiOutlinePlusCircle className="w-5 h-5" /> Create Ticket</>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="btn-secondary"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TicketCreate;
