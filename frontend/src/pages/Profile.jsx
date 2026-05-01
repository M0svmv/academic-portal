import React, { useState, useEffect } from 'react';
import Cookies from "js-cookie";
import { User, Mail, Phone, Lock, Save, ShieldCheck, RefreshCw, Edit2, X } from 'lucide-react';
import api from '../services/api';
import swalService from "../services/swal";
import '../pages/styles/ProgramCourses.css';
import "./styles/Profile.css";

const Profile = () => {
    const userType = Cookies.get("userType");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // البيانات الأصلية من السيرفر (للمقارنة)
    const [originalData, setOriginalData] = useState({});
    // البيانات الحالية في الفورم
    const [formData, setFormData] = useState({});

    const [isEditMode, setIsEditMode] = useState(false);

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [showPassSection, setShowPassSection] = useState(false);

    const endpoint = userType === "student" ? "/student/me" : "/staff/me";
    const nameKey = userType === "student" ? 'studentName' : 'staffName';
    const emailKey = userType === "student" ? 'studentEmail' : 'email';
    const phoneKey = userType === "student" ? 'studentPhone' : 'phone';

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await api.get(endpoint);
                setFormData(response.data);
                setOriginalData(response.data);
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [endpoint]);

    // التحقق هل اليوزر غير حاجة فعلاً؟
    const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData);

    const handleUpdateInfo = async (e) => {
        e.preventDefault();
        if (!isDirty) return;

        // حركة حلوة: نأكد عليه قبل ما يحفظ التغييرات
        const confirmSave = await swalService.confirm(
            "Save Changes?",
            "Are you sure you want to update your profile information?",
            "Yes, Update It"
        );
        if (!confirmSave.isConfirmed) return;

        setSaving(true);
        try {
            const response = await api.put(endpoint, formData);
            const updatedData = (response.data && !response.data.message) ? response.data : formData;

            setFormData(updatedData);
            setOriginalData(updatedData);

            // تحديث الكوكي... (نفس الكود بتاعك)

            // استخدام السيرفس بتاعتك للنجاح
            swalService.success("Updated!", "Your profile has been updated successfully.");
            setIsEditMode(false);
        } catch (error) {
            swalService.error("Update Failed", "We couldn't update your info. Please try again.");
        } finally {
            setSaving(false);
        }
    };
    const getPasswordStrength = (password) => {
        let points = 0;
        if (password.length > 8) points++;
        if (/[A-Z]/.test(password)) points++;
        if (/[0-9]/.test(password)) points++;
        if (/[^A-Za-z0-9]/.test(password)) points++;

        const levels = [
            { label: "Very Weak", color: "#ef4444", width: "25%" }, // Red
            { label: "Weak", color: "#fb923c", width: "50%" },      // Orange
            { label: "Strong", color: "#facc15", width: "75%" },    // Yellow
            { label: "Very Strong", color: "#22c55e", width: "100%" } // Green
        ];

        return password ? levels[points - 1] || levels[0] : null;
    };
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        const strength = getPasswordStrength(passwordData.newPassword);

        if (passwordData.newPassword.length < 6) {
            swalService.error("Too Short", "Password must be at least 6 characters.");
            return;
        }

        if (strength.label === "Very Weak") {
            swalService.error("Security Risk", "This password is too easy to guess. Please make it stronger!");
            return;
        }

        setSaving(true);
        swalService.showLoading("Securing your account..."); // اللودينج بتاعك

        try {
            await api.put(`${endpoint}`, {
                password: passwordData.newPassword
            });

            swalService.success("Secure!", "Password changed successfully!");
            setPasswordData({ newPassword: '', confirmPassword: '' });
            setShowPassSection(false);
        } catch (error) {
            swalService.error("Security Error", error.response?.data?.message || "Error changing password");
        } finally {
            setSaving(false);
        }
    };

    const cancelEdit = async () => {
        if (isDirty) {
            const result = await swalService.confirm(
                "Discard Changes?",
                "You have unsaved changes. Are you sure you want to cancel?",
                "Yes, Discard",
                "No, Keep Editing"
            );
            if (!result.isConfirmed) return;
        }

        setFormData(originalData);
        setIsEditMode(false);
    };

    if (loading) return <div className="loader-container">Loading Profile...</div>;

    return (
        <div className="management-container profile-page">
            <header className="management-header">
                <div className="prereg-header">
                    <h2>Account Settings</h2>
                </div>
            </header>

            <div className="profile-grid">

                {/* كارد المعلومات الشخصية */}
                <div className="profile-page-insight-card">
                    <div className="insight-header">
                        <div className="header-label-group">
                            <span className="insight-icon icon-blue"><User size={20} /></span>
                            <span className="insight-label">Personal Information</span>
                        </div>
                        {!isEditMode && (
                            <button className="btn-edit-toggle" onClick={() => setIsEditMode(true)}>
                                <Edit2 size={14} /> Edit Profile
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleUpdateInfo} className="profile-form-layout">
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                value={formData[nameKey] || ""}
                                readOnly={!isEditMode}
                                onChange={(e) => setFormData({ ...formData, [nameKey]: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Username</label>
                            <input type="text" value={formData.username || ""} disabled className="disabled-input" />
                        </div>

                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={formData[emailKey] || ""}
                                readOnly={!isEditMode}
                                onChange={(e) => setFormData({ ...formData, [emailKey]: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                type="text"
                                value={formData[phoneKey] || ""}
                                readOnly={!isEditMode}
                                onChange={(e) => setFormData({ ...formData, [phoneKey]: e.target.value })}
                            />
                        </div>

                        {isEditMode && (
                            <div className="form-actions">
                                <button type="submit" className="main-add-btn-profile btn-save" disabled={saving || !isDirty}>
                                    {saving ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
                                    <span>Save Changes</span>
                                </button>
                                <button type="button" className="main-add-btn-profile btn-cancel" onClick={cancelEdit}>
                                    Cancel
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                {/* كارد الحماية وكلمة المرور */}
                <div className="profile-page-insight-card">
                    <div className="insight-header">
                        <div className="header-label-group">
                            <span className="insight-icon icon-orange"><ShieldCheck size={20} /></span>
                            <span className="insight-label">Security & Password</span>
                        </div>
                    </div>

                    {!showPassSection ? (
                        <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                            <Lock size={40} color="#94a3b8" style={{ marginBottom: '15px' }} />
                            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                                For your security, do not share your password with others.
                            </p>
                            <button
                                onClick={() => setShowPassSection(true)}
                                className="btn-edit-toggle"
                                style={{ margin: '0 auto', padding: '10px 20px' }}
                            >
                                Change Account Password
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handlePasswordChange} className="profile-form-layout">

                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Enter new password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                />

                                {/* الـ Strength Meter */}
                                {passwordData.newPassword && (
                                    <div className="password-strength-wrapper">
                                        <div className="strength-bar-container">
                                            <div
                                                className="strength-bar-fill"
                                                style={{
                                                    width: getPasswordStrength(passwordData.newPassword).width,
                                                    backgroundColor: getPasswordStrength(passwordData.newPassword).color
                                                }}
                                            ></div>
                                        </div>
                                        <span className="strength-label" style={{ color: getPasswordStrength(passwordData.newPassword).color }}>
                                            {getPasswordStrength(passwordData.newPassword).label}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Repeat new password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                />
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="main-add-btn-profile btn-save" disabled={saving}>
                                    {saving ? <RefreshCw className="spin" size={16} /> : <ShieldCheck size={16} />}
                                    <span>Update Password</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPassSection(false);
                                        setPasswordData({ newPassword: '', confirmPassword: '' });
                                    }}
                                    className="main-add-btn-profile btn-cancel"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;