import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';

// Participant pages
import ParticipantDashboard from './pages/participant/Dashboard';
import BrowseEvents from './pages/participant/BrowseEvents';
import ParticipantEventDetail from './pages/participant/EventDetail';
import ParticipantProfile from './pages/participant/Profile';
import Organizers from './pages/participant/Organizers';
import OrganizerDetail from './pages/participant/OrganizerDetail';
import TeamDashboard from './pages/participant/TeamDashboard';
import TeamDetail from './pages/participant/TeamDetail';

// Organizer pages
import OrganizerDashboard from './pages/organizer/Dashboard';
import CreateEvent from './pages/organizer/CreateEvent';
import OrganizerEventDetail from './pages/organizer/EventDetail';
import OrganizerProfile from './pages/organizer/Profile';
import OngoingEvents from './pages/organizer/OngoingEvents';
import MerchOrders from './pages/organizer/MerchOrders';
import EventFeedback from './pages/organizer/EventFeedback';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageOrganizers from './pages/admin/ManageOrganizers';
import PasswordResets from './pages/admin/PasswordResets';

function App() {
    const { loading, isAuthenticated, role } = useAuth();

    if (loading) return <Loading />;

    const getDefaultRoute = () => {
        if (!isAuthenticated) return '/login';
        switch (role) {
            case 'participant': return '/dashboard';
            case 'organizer': return '/organizer/dashboard';
            case 'admin': return '/admin/dashboard';
            default: return '/login';
        }
    };

    return (
        <>
            <Navbar />
            <Routes>
                {/* Public */}
                <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={getDefaultRoute()} />} />
                <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to={getDefaultRoute()} />} />

                {/* Participant */}
                <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['participant']}><ParticipantDashboard /></ProtectedRoute>} />
                <Route path="/browse" element={<ProtectedRoute allowedRoles={['participant']}><BrowseEvents /></ProtectedRoute>} />
                <Route path="/browse/:id" element={<ProtectedRoute allowedRoles={['participant']}><ParticipantEventDetail /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute allowedRoles={['participant']}><ParticipantProfile /></ProtectedRoute>} />
                <Route path="/teams" element={<ProtectedRoute allowedRoles={['participant']}><TeamDashboard /></ProtectedRoute>} />
                <Route path="/teams/:id" element={<ProtectedRoute allowedRoles={['participant']}><TeamDetail /></ProtectedRoute>} />
                <Route path="/organizers" element={<ProtectedRoute allowedRoles={['participant']}><Organizers /></ProtectedRoute>} />
                <Route path="/organizers/:id" element={<ProtectedRoute allowedRoles={['participant']}><OrganizerDetail /></ProtectedRoute>} />

                {/* Organizer */}
                <Route path="/organizer/dashboard" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerDashboard /></ProtectedRoute>} />
                <Route path="/organizer/events/create" element={<ProtectedRoute allowedRoles={['organizer']}><CreateEvent /></ProtectedRoute>} />
                <Route path="/organizer/events/:id" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerEventDetail /></ProtectedRoute>} />
                <Route path="/organizer/events/:id/merch-orders" element={<ProtectedRoute allowedRoles={['organizer']}><MerchOrders /></ProtectedRoute>} />
                <Route path="/organizer/events/:id/feedback" element={<ProtectedRoute allowedRoles={['organizer']}><EventFeedback /></ProtectedRoute>} />
                <Route path="/organizer/profile" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerProfile /></ProtectedRoute>} />
                <Route path="/organizer/ongoing" element={<ProtectedRoute allowedRoles={['organizer']}><OngoingEvents /></ProtectedRoute>} />

                {/* Admin */}
                <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/organizers" element={<ProtectedRoute allowedRoles={['admin']}><ManageOrganizers /></ProtectedRoute>} />
                <Route path="/admin/password-resets" element={<ProtectedRoute allowedRoles={['admin']}><PasswordResets /></ProtectedRoute>} />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to={getDefaultRoute()} />} />
            </Routes>
        </>
    );
}

export default App;
