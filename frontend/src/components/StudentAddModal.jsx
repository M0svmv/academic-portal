import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import '../pages/styles/ProgramCourses.css';
const Student_REGULATION = ["New", "Last"]

const StudentAddModal = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        academicId: '',
        studentName: '',
        username: '',
        email: '',
        phone: '',
        password: ''
    });

    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({});


    useEffect(() => {
        if (isOpen) {
            setFormData({ academicId: '', studentName: '', username: '', email: '', phone: '', password: '' });
            setConfirmPassword('');
            setErrors({});
        }
    }, [isOpen]);

    const validate = () => {
        let newErrors = {};
        if (!formData.academicId.trim()) newErrors.academicId = "Academic ID is required";
        if (!formData.studentName.trim()) newErrors.studentName = "Student Name is required";
        if (!formData.username.trim()) newErrors.username = "Username is required";
        if (!formData.password) newErrors.password = "Password is required";
        else if (formData.password.length < 6) newErrors.password = "Min 6 characters required";
        if (formData.password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
        if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Invalid email format";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;

        const payload = {
            _id: formData.academicId,
            studentName: formData.studentName,
            username: formData.username,
            password: formData.password,
            studentPhone: formData.phone,
            studentEmail: formData.email
        };

        onSave(payload);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <div className="modal-head">
                    <h3>Add New Student</h3>
                    <X onClick={onClose} style={{ cursor: 'pointer' }} />
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Academic ID</label>
                            <input
                                className={errors.academicId ? "input-error" : ""}
                                value={formData.academicId}
                                onChange={e => setFormData({ ...formData, academicId: e.target.value })}
                                placeholder="e.g. 2024001"
                            />
                            {errors.academicId && <span className="error-msg">{errors.academicId}</span>}
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
                        <label>Student Full Name</label>
                        <input
                            className={errors.studentName ? "input-error" : ""}
                            value={formData.studentName}
                            onChange={e => setFormData({ ...formData, studentName: e.target.value })}
                        />
                        {errors.studentName && <span className="error-msg">{errors.studentName}</span>}
                    </div>

                    <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Email</label>
                            <input type="email"
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
                            <input type="password"
                                className={errors.password ? "input-error" : ""}
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                            {errors.password && <span className="error-msg">{errors.password}</span>}
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Confirm Password</label>
                            <input type="password"
                                className={errors.confirmPassword ? "input-error" : ""}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                            />
                            {errors.confirmPassword && <span className="error-msg">{errors.confirmPassword}</span>}
                        </div>
                    </div>
                    <button type="submit" className="btn-1">Create Student Account</button>
                </form>
            </div>
        </div>
    );
};

export default StudentAddModal;