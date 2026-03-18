// ============================================================
// ProtectedRoute — Role-based route guard
// ============================================================
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, roles = [] }) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (roles.length > 0 && !roles.includes(user?.role)) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="glass-card p-8 text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h2>
                    <p className="text-gray-500">You don't have permission to view this page.</p>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
