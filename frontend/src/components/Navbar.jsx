import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navConfig = {
    participant: [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/browse', label: 'Browse Events' },
        { path: '/teams', label: 'Teams' },
        { path: '/organizers', label: 'Clubs / Organizers' },
        { path: '/profile', label: 'Profile' },
    ],
    organizer: [
        { path: '/organizer/dashboard', label: 'Dashboard' },
        { path: '/organizer/events/create', label: 'Create Event' },
        { path: '/organizer/ongoing', label: 'Ongoing Events' },
        { path: '/organizer/profile', label: 'Profile' },
    ],
    admin: [
        { path: '/admin/dashboard', label: 'Dashboard' },
        { path: '/admin/organizers', label: 'Manage Clubs' },
        { path: '/admin/password-resets', label: 'Password Resets' },
    ],
};

export default function Navbar() {
    const { role, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    if (!isAuthenticated) return null;

    const links = navConfig[role] || [];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <span className="navbar-brand">🎉 FestPlatform</span>
                <div className="navbar-links">
                    {links.map((link) => (
                        <NavLink key={link.path} to={link.path}>
                            {link.label}
                        </NavLink>
                    ))}
                    <button onClick={handleLogout}>Logout</button>
                </div>
            </div>
        </nav>
    );
}
