// ============================================================
// DynamicForm — Renders conditional form fields from config
// ============================================================
import { useState, useEffect } from 'react';
import API from '../api/axios';

const DynamicForm = ({ subcategoryId, formData, onChange }) => {
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!subcategoryId) {
            setFields([]);
            return;
        }

        const fetchFields = async () => {
            setLoading(true);
            try {
                const res = await API.get(`/tickets/form-fields/${subcategoryId}`);
                setFields(res.data.fields || []);
            } catch (err) {
                console.error('Failed to load form fields:', err);
                setFields([]);
            } finally {
                setLoading(false);
            }
        };
        fetchFields();
    }, [subcategoryId]);

    // Check if a field should be visible based on parent conditions
    const isFieldVisible = (field) => {
        if (!field.parent_field_id) return true;

        const parentField = fields.find((f) => f.id === field.parent_field_id);
        if (!parentField) return false;

        const parentValue = formData[parentField.field_name];
        return parentValue === field.parent_field_value;
    };

    const renderField = (field) => {
        if (!isFieldVisible(field)) return null;

        const value = formData[field.field_name] || '';

        switch (field.field_type) {
            case 'text':
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(field.field_name, e.target.value)}
                        placeholder={field.field_label}
                        className="input-field"
                        required={field.is_required}
                    />
                );

            case 'textarea':
                return (
                    <textarea
                        value={value}
                        onChange={(e) => onChange(field.field_name, e.target.value)}
                        placeholder={field.field_label}
                        rows={3}
                        className="input-field resize-none"
                        required={field.is_required}
                    />
                );

            case 'select': {
                const options = field.field_options || [];
                return (
                    <select
                        value={value}
                        onChange={(e) => onChange(field.field_name, e.target.value)}
                        className="input-field"
                        required={field.is_required}
                    >
                        <option value="">Select {field.field_label}</option>
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );
            }

            case 'radio': {
                const options = field.field_options || [];
                return (
                    <div className="flex gap-4 flex-wrap">
                        {options.map((opt) => (
                            <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                <input
                                    type="radio"
                                    name={field.field_name}
                                    value={opt.value}
                                    checked={value === opt.value}
                                    onChange={(e) => onChange(field.field_name, e.target.value)}
                                    className="w-4 h-4 accent-primary-500"
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                );
            }

            case 'checkbox':
                return (
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => onChange(field.field_name, e.target.checked)}
                            className="w-4 h-4 accent-primary-500 rounded"
                        />
                        {field.field_label}
                    </label>
                );

            default:
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(field.field_name, e.target.value)}
                        placeholder={field.field_label}
                        className="input-field"
                    />
                );
        }
    };

    if (loading) {
        return (
            <div className="py-4 text-center text-gray-400 text-sm">
                Loading form fields...
            </div>
        );
    }

    if (fields.length === 0) return null;

    return (
        <div className="space-y-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                Additional Information
            </h4>
            {fields.map((field) => {
                if (!isFieldVisible(field)) return null;
                return (
                    <div key={field.id} className="animate-fade-in">
                        {field.field_type !== 'checkbox' && (
                            <label className="input-label">
                                {field.field_label}
                                {field.is_required && <span className="text-red-400 ml-1">*</span>}
                            </label>
                        )}
                        {renderField(field)}
                    </div>
                );
            })}
        </div>
    );
};

export default DynamicForm;
