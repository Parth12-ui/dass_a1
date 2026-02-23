import { useState, useEffect } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/Loading';

const interestOptions = ['Tech', 'Music', 'Dance', 'Art', 'Sports', 'Literature', 'Gaming', 'Photography', 'Film', 'Comedy', 'Quiz', 'Robotics', 'Coding', 'Design', 'Business'];

export default function Profile() {
    const { user, updateUser } = useAuth();
    const [form, setForm] = useState({});
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        Promise.all([
            API.get('/participants/profile'),
            API.get('/participants/organizers'),
        ]).then(([profileRes, orgRes]) => {
            setForm(profileRes.data);
            setOrganizers(orgRes.data);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await API.put('/participants/profile', {
                firstName: form.firstName,
                lastName: form.lastName,
                contactNumber: form.contactNumber,
                collegeName: form.collegeName,
                interests: form.interests,
                followedOrganizers: form.followedOrganizers?.map(o => o._id || o),
                onboardingCompleted: true,
            });
            updateUser(res.data.user);
            setMessage({ type: 'success', text: 'Profile updated!' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordMsg({ type: '', text: '' });
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'Passwords do not match' });
            return;
        }
        try {
            await API.post('/auth/change-password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });
            setPasswordMsg({ type: 'success', text: 'Password changed!' });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setPasswordMsg({ type: 'error', text: err.response?.data?.message || 'Failed' });
        }
    };

    const toggleInterest = (interest) => {
        const current = form.interests || [];
        setForm({
            ...form,
            interests: current.includes(interest) ? current.filter((i) => i !== interest) : [...current, interest],
        });
    };

    if (loading) return <Loading />;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Profile</h1>
                <p>Manage your account and preferences</p>
            </div>

            <div className="grid-2" style={{ gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
                {/* Profile Form */}
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1rem' }}>Personal Info</h3>

                    {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group">
                            <label>First Name</label>
                            <input className="form-input" value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input className="form-input" value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Email <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>(non-editable)</span></label>
                        <input className="form-input" value={form.email || ''} disabled style={{ opacity: 0.6 }} />
                    </div>

                    <div className="form-group">
                        <label>Participant Type <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>(non-editable)</span></label>
                        <input className="form-input" value={form.participantType || ''} disabled style={{ opacity: 0.6 }} />
                    </div>

                    <div className="form-group">
                        <label>College / Organization</label>
                        <input className="form-input" value={form.collegeName || ''} onChange={(e) => setForm({ ...form, collegeName: e.target.value })} />
                    </div>

                    <div className="form-group">
                        <label>Contact Number</label>
                        <input className="form-input" value={form.contactNumber || ''} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
                    </div>

                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {/* Right side */}
                <div>
                    {/* Interests */}
                    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Areas of Interest</h3>
                        <div className="tag-chips">
                            {interestOptions.map((interest) => (
                                <span key={interest} className={`tag-chip ${(form.interests || []).includes(interest) ? 'selected' : ''}`} onClick={() => toggleInterest(interest)}>
                                    {interest}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Password Change */}
                    <div className="glass-card">
                        <h3 style={{ marginBottom: '1rem' }}>Change Password</h3>
                        {passwordMsg.text && <div className={`alert alert-${passwordMsg.type}`}>{passwordMsg.text}</div>}
                        <form onSubmit={handlePasswordChange}>
                            <div className="form-group">
                                <label>Current Password</label>
                                <input type="password" className="form-input" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <input type="password" className="form-input" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input type="password" className="form-input" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
                            </div>
                            <button type="submit" className="btn btn-secondary">Update Password</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
