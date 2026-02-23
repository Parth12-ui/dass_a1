import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
    const { isAuthenticated, role, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        // Redirect to their own dashboard
        const dashboards = {
            participant: '/dashboard',
            organizer: '/organizer/dashboard',
            admin: '/admin/dashboard',
        };
        return <Navigate to={dashboards[role] || '/login'} replace />;
    }

    return children;
}
