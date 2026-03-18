// ============================================================
// Feedback Modal — Star rating + comment after ticket closure
// ============================================================
import { useState } from 'react';
import { HiOutlineStar, HiStar, HiOutlineX } from 'react-icons/hi';

const FeedbackModal = ({ isOpen, onClose, onSubmit }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (rating === 0) return;
        setLoading(true);
        try {
            await onSubmit(rating, comment);
            setRating(0);
            setComment('');
            onClose();
        } catch (err) {
            // Error handled by parent
        } finally {
            setLoading(false);
        }
    };

    const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-card p-8 w-full max-w-md animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Rate Your Experience</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                        <HiOutlineX className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-sm text-gray-500 mb-6">
                    How was your support experience? Your feedback helps us improve.
                </p>

                {/* Star Rating */}
                <div className="flex flex-col items-center gap-2 mb-6">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="transition-transform hover:scale-110"
                            >
                                {star <= (hoverRating || rating) ? (
                                    <HiStar className="w-10 h-10 text-amber-400" />
                                ) : (
                                    <HiOutlineStar className="w-10 h-10 text-gray-400" />
                                )}
                            </button>
                        ))}
                    </div>
                    {(hoverRating || rating) > 0 && (
                        <span className="text-sm font-medium text-amber-400 animate-fade-in">
                            {ratingLabels[hoverRating || rating]}
                        </span>
                    )}
                </div>

                {/* Comment */}
                <div className="mb-6">
                    <label className="input-label">Additional Comments (Optional)</label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Tell us more about your experience..."
                        rows={3}
                        className="input-field resize-none"
                    />
                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={rating === 0 || loading}
                    className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        'Submit Feedback'
                    )}
                </button>
            </div>
        </div>
    );
};

export default FeedbackModal;
