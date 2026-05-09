import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Cookies from "js-cookie";
import { User, Mail, Phone, Lock, Save, ShieldCheck, RefreshCw, Edit2, X, Loader2 } from 'lucide-react';
import api from '../services/api';
import swalService from "../services/swal";
import '../pages/styles/ProgramCourses.css';
import "./styles/Profile.css";

const Profile = () => {
    const userType = Cookies.get("userType");
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [originalData, setOriginalData] = useState({});
    const [formData, setFormData] = useState({});
    const [isEditMode, setIsEditMode] = useState(false);

    // --- حالة جديدة لتحديد ما إذا كانت البيانات ناقصة فعلياً ---
    const [isDataIncomplete, setIsDataIncomplete] = useState(false);

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
                const data = response.data;
                setFormData(data);
                setOriginalData(data);

                const hasMissingInfo = !data[emailKey] || !data[phoneKey];
                setIsDataIncomplete(hasMissingInfo);

                if (location.state?.forceEdit || hasMissingInfo) {
                    setIsEditMode(true);
                    swalService.info(
                        "Information Required",
                        "Please complete your profile details (Email and Phone) to continue."
                    );
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [endpoint, location.state, emailKey, phoneKey]);


    const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData);

    const handleUpdateInfo = async (e) => {
        e.preventDefault();

        if (!formData[emailKey] || !formData[phoneKey]) {
            swalService.error("Missing Info", "Email and Phone number are required.");
            return;
        }

        if (!isDirty) return;

        const confirmSave = await swalService.confirm(
            "Save Changes?",
            "Are you sure you want to update your profile information?",
            "Yes, Update It"
        );
        if (!confirmSave.isConfirmed) return;

        setSaving(true);
        try {
            // نرسل الـ formData المعدلة للـ API
            const response = await api.put(endpoint, formData);

            // تصحيح: نعتمد على formData الحالية لو الـ API مرجعش الـ Object كامل
            const updatedDataFromApi = (response.data && response.data[emailKey]) ? response.data : formData;

            setFormData(updatedDataFromApi);
            setOriginalData(updatedDataFromApi);

            setIsDataIncomplete(false);

            swalService.success("Updated!", "Your profile has been updated successfully.");
            setIsEditMode(false);
        } catch (error) {
            console.error("Update error:", error);
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
            { label: "Very Weak", color: "#ef4444", width: "25%" },
            { label: "Weak", color: "#fb923c", width: "50%" },
            { label: "Strong", color: "#facc15", width: "75%" },
            { label: "Very Strong", color: "#22c55e", width: "100%" }
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
        swalService.showLoading("Securing your account...");

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
        if (isDataIncomplete) {
            swalService.error("Action Prohibited", "You must fill in your email and phone before you can exit edit mode.");
            return;
        }

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

    if (loading) return (
        <div
            className="management-container"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '80vh',
                flexDirection: 'column',
                gap: '14px'
            }}
        >
            <Loader2
                size={42}
                style={{
                    animation: 'spin 1s linear infinite',
                    color: '#2563eb'
                }}
            />
            <h3>Loading Profile...</h3>
        </div>
    );

    return (
        <div className="management-container profile-page">
            <header className="management-header">
                <div className="prereg-header">
                    <h2>Account Settings {isDataIncomplete && <span style={{ color: '#ef4444', fontSize: '14px', marginLeft: '10px' }}>(Information Required)</span>}</h2>
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
                        {/* إخفاء زرار التعديل إذا كنا بالفعل في وضع الإجبار أو التعديل */}
                        {!isEditMode && !isDataIncomplete && (
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
                                required
                                placeholder="Required for notifications"
                            />
                        </div>

                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                type="text"
                                value={formData[phoneKey] || ""}
                                readOnly={!isEditMode}
                                onChange={(e) => setFormData({ ...formData, [phoneKey]: e.target.value })}
                                required
                                placeholder="Required for contact"
                            />
                        </div>

                        {isEditMode && (
                            <div className="form-actions">
                                <button type="submit" className="main-add-btn-profile btn-save" disabled={saving || !isDirty}>
                                    {saving ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
                                    <span>Save Changes</span>
                                </button>

                                {/* إخفاء زرار الـ Cancel تماماً لو البيانات ناقصة */}
                                {!isDataIncomplete && (
                                    <button type="button" className="main-add-btn-profile btn-cancel" onClick={cancelEdit}>
                                        Cancel
                                    </button>
                                )}
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
                                disabled={isDataIncomplete} // تعطيل تغيير الباسورد حتى تكتمل البيانات الأساسية
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