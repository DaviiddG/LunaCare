import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedRoute() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ color: 'var(--color-primary-dark)' }}>Cargando...</div>
            </div>
        );
    }

    if (!user) {
        // If not logged in, redirect to login page
        return <Navigate to="/login" replace />;
    }

    // If logged in, render the child routes (the app layout)
    return <Outlet />;
}
