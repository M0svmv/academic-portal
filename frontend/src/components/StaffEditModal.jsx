import React, { useState, useEffect } from 'react';
import { X, Lock, User, Mail, Phone, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import swalService from "../services/swal";

import '../pages/styles/ProgramCourses.css';

const ROLES = ['coordinator', 'lecturer', 'ta', 'admin', 'academic-advisor'];

const EditStaffModal = ({ isOpen, onClose, staffId, onUpdate }) => {
    const [formData, setFormData] = useState({
        staffName: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        roles: []
    });
    const [errors, setErrors] = useState({});
    const [changePassword, setChangePassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && staffId) {
            const fetchStaff = async () => {
                try {
                    setLoading(true);

                    const res = await api.get(`/staff/${staffId}`);

                    const data = res.data.data ? res.data.data : res.data;

                    setFormData({
                        staffName: data.staffName || '',
                        username: data.username || '',
                        email: data.email || '',
                        phone: data.phone || '',
                        roles: data.roles || []
                    });

                    setChangePassword(false);
                    setConfirmPassword('');
                    setErrors({});
                } catch (err) {
                    console.error("Fetch Error:", err);
                    swalService.error("Fetch Failed", "Could not load staff data. Please try again.");
                    onClose();
                } finally {
                    setLoading(false);
                }
            };
            fetchStaff();
        }
    }, [isOpen, staffId]);

    const addRole = (role) => {
        if (role && !formData.roles.includes(role)) {
            setFormData({ ...formData, roles: [...formData.roles, role] });
        }
    };

    const removeRole = (role) => {
        setFormData({ ...formData, roles: formData.roles.filter(r => r !== role) });
    };

    const validateBasic = () => {
        let newErrors = {};
        if (!formData.staffName.trim()) newErrors.staffName = "Staff Name is required";
        if (!formData.username.trim()) newErrors.username = "Username is required";
        if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Invalid email";
        if (!formData.roles.length) newErrors.roles = "At least one role required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleUpdateBasicInfo = async (e) => {
        if (e) e.preventDefault();
        if (!validateBasic()) return;

        try {
            setLoading(true);
            swalService.showLoading("Updating staff information...");

            const payload = {
                staffName: formData.staffName,
                username: formData.username,
                email: formData.email,
                phone: formData.phone,
                roles: formData.roles
            };

            await api.put(`/staff/${staffId}`, payload);

            await swalService.success("Success", "Staff data updated successfully");
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error("Update Error:", err);
            const msg = err.response?.data?.message || "Failed to update info";
            swalService.error("Update Failed", msg);
        } finally {
            setLoading(false);
        }
    };


    const handleUpdatePassword = async (e) => {
        e.preventDefault();

        if (!formData.password || formData.password.length < 4) {
            return swalService.error("Invalid Password", "Password must be at least 4 characters.");
        }
        if (formData.password !== confirmPassword) {
            return swalService.error("Mismatch", "Passwords do not match.");
        }

        try {
            setLoading(true);
            swalService.showLoading("Resetting password...");

            const passwordPayload = {
                password: formData.password
            };

            await api.put(`/staff/${staffId}`, passwordPayload);

            await swalService.success("Changed!", "Password has been updated successfully.");

            setChangePassword(false);
            setFormData(prev => ({ ...prev, password: '' }));
            setConfirmPassword('');
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to change password";
            swalService.error("Error", msg);
        } finally {
            setLoading(false);
        }
    };
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-card" style={{ maxWidth: '500px', width: '90%' }}>
                <div className="modal-head">
                    <h3>Edit Staff Member</h3>
                    <X onClick={onClose} style={{ cursor: 'pointer' }} />
                </div>

                <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>

                    {/* فورم البيانات الأساسية */}
                    <form onSubmit={handleUpdateBasicInfo}>
                        <div className="form-group">
                            <label>Staff Name</label>
                            <input
                                className={errors.staffName ? "input-error" : ""}
                                value={formData.staffName}
                                onChange={e => setFormData({ ...formData, staffName: e.target.value })}
                            />
                            {errors.staffName && <span className="error-msg">{errors.staffName}</span>}
                        </div>

                        <div className="form-group" style={{ marginTop: '5px' }}>
                            <label>Username</label>
                            <input
                                className={errors.username ? "input-error" : ""}
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                            />
                            {errors.username && <span className="error-msg">{errors.username}</span>}
                        </div>

                        <div className="form-row" style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label> Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Phone</label>
                                <input
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '5px' }}>
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
                        </div>
                        <div className="form-row" style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            <button type="submit" className="btn-submit" disabled={loading} style={{ flex: 1 }} >
                                {loading ? "Saving..." : "Update Basic Info"
                                }
                                {console.log(formData)}
                                {console.log(formData.roles)}
                            </button>
                        </div>
                    </form>

                    <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />

                    {/* قسم الباسورد المنفصل */}
                    {!changePassword ? (
                        <button
                            type="button"
                            className="btn-secondary"
                            style={{ width: '100%', background: 'transparent', color: '#b44d4b', border: '1px dashed #b44d4b', padding: '10px', borderRadius: '5px' }}
                            onClick={() => setChangePassword(true)}
                        >
                            <Lock size={16} style={{ marginRight: '8px', display: 'inline' }} /> Change Staff Password?
                        </button>
                    ) : (
                        <form onSubmit={handleUpdatePassword} style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <strong>Update Password</strong>
                                <button type="button" onClick={() => setChangePassword(false)} style={{ border: 'none', background: 'none', color: '#b44d4b', cursor: 'pointer' }}>Cancel</button>
                            </div>
                            <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-row" style={{ display: 'flex', gap: '10px', marginTop: '5px', justifyContent: 'center' }}>
                                <button type="submit" className="btn-submit" style={{ background: '#b44d4b', padding: ' 10px 20px' }} disabled={loading}>
                                    {loading ? "Updating..." : "Confirm New Password"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div >
    );
};

export default EditStaffModal;
