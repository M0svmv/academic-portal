import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import '../pages/styles/ProgramCourses.css';

const ROLES = ['coordinator', 'lecturer', 'ta', 'admin', 'academic-advisor'];

const AddStaffModal = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        _id: '',
        staffName: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        roles: []
    });

    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            setFormData({ _id: '', staffName: '', username: '', email: '', phone: '', password: '', roles: [] });
            setConfirmPassword('');
            setErrors({});
        }
    }, [isOpen]);

    const addRole = (role) => {
        if (role && !formData.roles.includes(role)) {
            setFormData({ ...formData, roles: [...formData.roles, role] });
        }
    };

    const removeRole = (role) => {
        setFormData({ ...formData, roles: formData.roles.filter(r => r !== role) });
    };

    const validate = () => {
        let newErrors = {};
        if (!formData._id.trim()) newErrors._id = "Staff ID is required";
        if (!formData.staffName.trim()) newErrors.staffName = "Staff Name is required";
        if (!formData.username.trim()) newErrors.username = "Username is required";
        if (!formData.password) newErrors.password = "Password is required";
        else if (formData.password.length < 6) newErrors.password = "Min 6 characters required";
        if (formData.password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
        if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Invalid email";
        if (!formData.roles.length) newErrors.roles = "At least one role required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;

        const payload = {
            _id: formData._id,
            staffName: formData.staffName,
            username: formData.username,
            email: formData.email.trim() === '' ? undefined : formData.email,
            phone: formData.phone,
            password: formData.password,
            roles: formData.roles
        };
        onSave(payload);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <div className="modal-head">
                    <h3>Add New Staff</h3>
                    <X onClick={onClose} style={{ cursor: 'pointer' }} />
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Staff ID</label>
                            <input
                                className={errors._id ? "input-error" : ""}
                                value={formData._id}
                                onChange={e => setFormData({ ...formData, _id: e.target.value })}
                            />
                            {errors._id && <span className="error-msg">{errors._id}</span>}
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Username</label>
                            <input
                                className={errors.username ? "input-error" : ""}
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                            />
                            {errors.username && <span className="error-msg">{errors.username}</span>}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Staff Name</label>
                        <input
                            className={errors.staffName ? "input-error" : ""}
                            value={formData.staffName}
                            onChange={e => setFormData({ ...formData, staffName: e.target.value })}
                        />
                        {errors.staffName && <span className="error-msg">{errors.staffName}</span>}
                    </div>

                    <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                            {errors.email && <span className="error-msg">{errors.email}</span>}
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Phone</label>
                            <input
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Password</label>
                            <input
                                type="password"
                                className={errors.password ? "input-error" : ""}
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                            {errors.password && <span className="error-msg">{errors.password}</span>}
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Confirm Password</label>
                            <input
                                type="password"
                                className={errors.confirmPassword ? "input-error" : ""}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                            />
                            {errors.confirmPassword && <span className="error-msg">{errors.confirmPassword}</span>}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Roles</label>
                        <div className="chips-container">
                            {formData.roles.map(role => (
                                <span key={role} className="chip">
                                    {role} <button type="button" onClick={() => removeRole(role)}>×</button>
                                </span>
                            ))}
                        </div>
                        <select onChange={e => addRole(e.target.value)} value="">
                            <option value="" disabled>Add a role...</option>
                            {ROLES.filter(r => !formData.roles.includes(r)).map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                        {errors.roles && <span className="error-msg">{errors.roles}</span>}
                    </div>
                    <button type="submit" className="btn-1">Create Staff</button>
                </form>
            </div>
        </div>
    );
};

export default AddStaffModal;