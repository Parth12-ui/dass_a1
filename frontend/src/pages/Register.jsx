import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ReCAPTCHA from 'react-google-recaptcha';

export default function Register() {
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        participantType: 'non-iiit',
        collegeName: '',
        contactNumber: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const captchaRef = useRef(null);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const { confirmPassword, ...data } = form;
            data.captchaToken = captchaRef.current?.getValue() || '';
            if (data.participantType === 'iiit') data.collegeName = 'IIIT Hyderabad';
            await register(data);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass-card" style={{ maxWidth: 520 }}>
                <h1>Create Account</h1>
                <p className="subtitle">Join the fest platform as a participant</p>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group">
                            <label>First Name</label>
                            <input name="firstName" className="form-input" placeholder="John" value={form.firstName} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input name="lastName" className="form-input" placeholder="Doe" value={form.lastName} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Participant Type</label>
                        <select name="participantType" className="form-input" value={form.participantType} onChange={handleChange}>
                            <option value="iiit">IIIT Student</option>
                            <option value="non-iiit">Non-IIIT Participant</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Email {form.participantType === 'iiit' && <span style={{ color: 'var(--accent-secondary)', fontSize: 'var(--font-xs)' }}>(@iiit.ac.in required)</span>}</label>
                        <input name="email" type="email" className="form-input" placeholder={form.participantType === 'iiit' ? 'you@iiit.ac.in' : 'you@example.com'} value={form.email} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>College / Organization {form.participantType === 'iiit' && <span style={{ color: 'var(--accent-secondary)', fontSize: 'var(--font-xs)' }}>(auto-set)</span>}</label>
                        <input name="collegeName" className="form-input" placeholder="Your college or org" value={form.participantType === 'iiit' ? 'IIIT Hyderabad' : form.collegeName} onChange={handleChange} disabled={form.participantType === 'iiit'} />
                    </div>

                    <div className="form-group">
                        <label>Contact Number</label>
                        <input name="contactNumber" className="form-input" placeholder="9876543210" value={form.contactNumber} onChange={handleChange} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group">
                            <label>Password</label>
                            <input name="password" type="password" className="form-input" placeholder="••••••••" value={form.password} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input name="confirmPassword" type="password" className="form-input" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="form-group" style={{ display: 'flex', justifyContent: 'center' }}>
                        <ReCAPTCHA
                            ref={captchaRef}
                            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
                            theme="dark"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-switch">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
