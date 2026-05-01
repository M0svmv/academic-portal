import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import '../pages/styles/ProgramCourses.css';

const ROLES = ['coordinator', 'lecturer', 'ta', 'admin', 'academic-advisor'];

const StaffModal = ({ isOpen, onClose, onSave, initialData = null }) => {
    const [formData, setFormData] = useState({
        _id: '',
        staffName: '',
        username: '',
        email: '',
        phone: '',
        // password: '',
        roles: []
    });

    const [errors, setErrors] = useState({});
    const [changePassword, setChangePassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (isOpen) {
            setErrors({});
            setConfirmPassword('');
            if (initialData) {
                setFormData({
                    _id: initialData._id || '',
                    staffName: initialData.staffName || '',
                    username: initialData.username || '',
                    email: initialData.staffEmail || '', // Mapping من الباك لـ الـ State
                    phone: initialData.staffPhone || '', // Mapping من الباك لـ الـ State
                    roles: initialData.roles || [],
                    password: ''
                });
                setChangePassword(false);
            } else {
                setFormData({
                    _id: '',
                    staffName: '',
                    username: '',
                    email: '',
                    phone: '',
                    password: '',
                    roles: []
                });
                setChangePassword(true);
            }
        }
    }, [initialData, isOpen]);

    /* Roles Logic */
    const addRole = (role) => {
        if (role && !formData.roles.includes(role)) {
            setFormData({ ...formData, roles: [...formData.roles, role] });
        }
    };

    const removeRole = (role) => {
        setFormData({ ...formData, roles: formData.roles.filter(r => r !== role) });
    };

    /* Validation Logic */
    const validate = () => {
        let newErrors = {};

        if (!formData._id.toString().trim()) newErrors._id = "Staff ID is required";
        if (!formData.staffName.trim()) newErrors.staffName = "Staff Name is required";
        if (!formData.username.trim()) newErrors.username = "Username is required";

        // Validation للجزء الخاص بالباسوورد
        if (!initialData || changePassword) {
            if (!formData.password) {
                newErrors.password = "Password is required";
            } else if (formData.password.length < 6) {
                newErrors.password = "Min 6 characters required";
            }
            if (formData.password !== confirmPassword) {
                newErrors.confirmPassword = "Passwords do not match";
            }
        }

        if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Invalid email";
        if (!formData.roles.length) newErrors.roles = "At least one role required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;

        let payload = {
            staffName: formData.staffName,
            username: formData.username,
            staffEmail: formData.email,
            staffPhone: formData.phone,
            roles: formData.roles
        };

        // if (!initialData || changePassword) {
        //     if (formData.password.trim() !== "") {
        //         payload.password = formData.password;
        //     }
        // }

        onSave(payload);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <div className="modal-head">
                    <h3>{initialData ? 'Edit Staff Member' : 'Add New Staff'}</h3>
                    <X onClick={onClose} style={{ cursor: 'pointer' }} />
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label>Staff ID</label>
                        <input
                            disabled={!!initialData} // غالباً الـ ID مش بيتغير في التعديل
                            className={errors._id ? "input-error" : ""}
                            value={formData._id}
                            onChange={e => setFormData({ ...formData, _id: e.target.value })}
                        />
                        {errors._id && <span className="error-msg">{errors._id}</span>}
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

                    <div className="form-group">
                        <label>Username</label>
                        <input
                            className={errors.username ? "input-error" : ""}
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                        />
                        {errors.username && <span className="error-msg">{errors.username}</span>}
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

                    {/* خيار تغيير الباسوورد في التعديل */}
                    {initialData && (
                        <div className="checkbox-container" style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="checkbox"
                                id="changePass"
                                checked={changePassword}
                                onChange={() => setChangePassword(!changePassword)}
                            />
                            <label htmlFor="changePass" style={{ margin: 0, cursor: 'pointer' }}>Change Password</label>
                        </div>
                    )}

                    {/* حقول الباسوورد */}
                    {changePassword && (
                        <div className="password-section" style={{ background: '#f9f9f9', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    className={errors.password ? "input-error" : ""}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                                {errors.password && <span className="error-msg">{errors.password}</span>}
                            </div>
                            <div className="form-group">
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
                    )}

                    <div className="form-group">
                        <label>Roles</label>
                        <div className="chips-container">
                            {formData.roles.map(role => (
                                <span key={role} className="chip">
                                    {role} <button type="button" onClick={() => removeRole(role)}>×</button>
                                </span>
                            ))}
                        </div>
                        <select onChange={(e) => addRole(e.target.value)} value="">
                            <option value="" disabled>Add a role...</option>
                            {ROLES.filter(r => !formData.roles.includes(r)).map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                        {errors.roles && <span className="error-msg">{errors.roles}</span>}
                    </div>

                    <button type="submit" className="btn-submit">
                        {initialData ? 'Update Staff' : 'Create Staff'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StaffModal;