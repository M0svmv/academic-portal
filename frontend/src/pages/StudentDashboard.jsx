import React, { useEffect, useState } from "react";
import {
    Megaphone, Calendar, User, Video,
    ArrowRight, Clock, Bell, CalendarCheck,
    ChevronDown, Filter, AlertCircle, Bookmark, Info, AlertTriangle, BookOpen
} from "lucide-react";
import { CalendarDays, CalendarPlus, Loader2 } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./styles/StudentDashboard.css";

const StudentDashboard = () => {
    const navigate = useNavigate();

    // States
    const [announcements, setAnnouncements] = useState([]);
    const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [annRes, meetingRes, profileRes] = await Promise.all([
                api.get("/student/me/announcements"),
                api.get("/student/me/meetings"),
                api.get("/student/me/profile").catch(() => ({ data: { studentName: "Student" } }))
            ]);

            setAnnouncements(annRes.data);
            setFilteredAnnouncements(annRes.data);
            setMeetings(meetingRes.data);
            setStudentName(profileRes.data.studentName || profileRes.data.name || "Student");
        } catch (err) {
            console.error("Dashboard error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = async (tabType) => {
        setActiveTab(tabType);
        setLoading(true);
        try {
            if (tabType === "all") {
                setFilteredAnnouncements(announcements);
                setLoading(false);
                return;
            }

            let filtered;
            if (tabType === "advisingList") {
                const res = await api.get("/student/me/advising-list-announcements");
                setFilteredAnnouncements(res.data);
                setLoading(false);
                return;
            } else if (tabType === "specificStudents") {
                filtered = announcements.filter(a => a.target === "specificStudents");
            } else if (tabType === "all-public") {
                filtered = announcements.filter(a => a.target === "all");
            } else if (tabType === "academic") {
                filtered = announcements.filter(a => a.target === "course" || a.target === "level");
            }

            setFilteredAnnouncements(filtered || []);
        } catch (err) {
            console.error("Filter error:", err);
            setFilteredAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case "approved": return "sd-status-approved";
            case "declined": return "sd-status-declined";
            default: return "sd-status-pending";
        }
    };

    const getTagClass = (target) => {
        switch (target) {
            case "advisingList": return "sd-tag-academic";
            case "all": return "sd-tag-public";
            case "specificStudents": return "sd-tag-dept";
            case "course":
            case "level": return "sd-tag-academic";
            default: return "sd-tag-public";
        }
    };

    const getTargetLabel = (target) => {
        switch (target) {
            case "all": return "Public";
            case "advisingList": return "Advising";
            case "specificStudents": return "Private";
            case "course": return "Course";
            case "level": return "Level";
            default: return target;
        }
    };

    const getTypeBadgeStyle = (type) => {
        const base = {
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "10px",
            fontWeight: "bold",
            textTransform: "uppercase",
            marginLeft: "8px"
        };
        switch (type) {
            case "urgent": return { ...base, backgroundColor: "#fee2e2", color: "#dc2626" };
            case "deadline": return { ...base, backgroundColor: "#fef3c7", color: "#d97706" };
            case "warning": return { ...base, backgroundColor: "#ffedd5", color: "#ea580c" };
            case "event": return { ...base, backgroundColor: "#f3e8ff", color: "#9333ea" };
            default: return { ...base, backgroundColor: "#e0f2fe", color: "#0284c7" };
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case "urgent": return <AlertCircle size={12} />;
            case "deadline": return <Clock size={12} />;
            case "warning": return <AlertTriangle size={12} />;
            case "event": return <Calendar size={12} />;
            default: return <Info size={12} />;
        }
    };

    const getStaffRole = (ann) => {
        if (ann.target === "course") return "Course Instructor";
        if (ann.target === "advisingList") return "Academic Advisor";
        return "Department Admin";
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const filterOptions = [
        { id: "all", label: "All Announcements" },
        { id: "all-public", label: "Public Announcements" },
        { id: "advisingList", label: "Advising List" },
        { id: "specificStudents", label: "Private (Specific)" },
        { id: "academic", label: "Academic (Course/Level)" }
    ];

    return (
        <div className="management-container sd-page-wrapper">
            {/* Header Section */}
            <header className="sd-main-header">
                <div className="prereg-header">
                    <h2 className="sd-title">Welcome back, {studentName}!</h2>
                </div>
            </header>

            {/* Stats / Quick Insights */}
            <div className="sd-stats-grid">
                <div className="sd-stat-card">
                    <div className="sd-stat-icon-wrapper sd-ann-bg"><Bell size={20} /></div>
                    <div className="sd-stat-info">
                        <span className="sd-stat-label">Announcements</span>
                        <span className="sd-stat-value">{announcements.length}</span>
                    </div>
                </div>
                <div className="sd-stat-card">
                    <div className="sd-stat-icon-wrapper sd-meet-bg"><CalendarCheck size={20} /></div>
                    <div className="sd-stat-info">
                        <span className="sd-stat-label">Meetings</span>
                        <span className="sd-stat-value">{meetings.length}</span>
                    </div>
                </div>
            </div>

            <div className="sd-content-layout">
                {/* Main Content: Announcements */}
                <main className="sd-announcements-area">
                    <div className="sd-glass-card" style={{ padding: '20px' }}>
                        <div className="sd-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                            <div className="sd-section-title-box" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Megaphone className="sd-primary-icon" size={24} color="#3b82f6" />
                                <h2 className="sd-section-heading" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Recent Announcements</h2>
                            </div>

                            <div className="sd-filter-dropdown-container">
                                <div className="sd-select-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <select
                                        className="sd-custom-select"
                                        style={{ padding: '8px 35px 8px 15px', borderRadius: '8px', border: '1px solid #ddd', appearance: 'none', backgroundColor: '#fff', fontSize: '14px' }}
                                        value={activeTab}
                                        onChange={(e) => handleTabChange(e.target.value)}
                                    >
                                        {filterOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <Filter style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#666' }} size={16} />
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="sd-loading-state">
                                <div className="sd-custom-spinner"></div>
                                <p>Updating feed...</p>
                            </div>
                        ) : filteredAnnouncements.length === 0 ? (
                            <div className="sd-empty-state">
                                <p>No announcements found in this category.</p>
                            </div>
                        ) : (
                            <div className="sd-cards-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {filteredAnnouncements.map((ann) => {
                                    return (
                                        <div key={ann._id} className={`sd-ann-item ${ann.isPinned ? 'sd-pinned' : ''}`} style={{
                                            backgroundColor: '#fff',
                                            borderRadius: '12px',
                                            padding: '20px',
                                            border: '1px solid #eef2f6',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                            position: 'relative'
                                        }}>
                                            <div className="sd-ann-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                <div className="sd-header-badges" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span className={`sd-pill-tag ${getTagClass(ann.target)}`} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#e0e7ff', color: '#4338ca' }}>
                                                        {getTargetLabel(ann.target)}
                                                    </span>
                                                    <span style={getTypeBadgeStyle(ann.type)}>
                                                        {getTypeIcon(ann.type)}
                                                        {ann.type}
                                                    </span>
                                                </div>
                                                <span className="sd-semester-text" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                                                    {ann.semesterId?.name || ann.semesterId}
                                                </span>
                                            </div>

                                            {ann.courseId && (
                                                <div className="sd-course-context" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0f9ff', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', marginBottom: '10px' }}>
                                                    <BookOpen size={14} />
                                                    <span>{ann.courseId.courseId?.courseName || "Course Update"}</span>
                                                </div>
                                            )}

                                            <h3 className="sd-ann-title" style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold', color: '#1e293b', textAlign: 'right', direction: 'rtl' }}>
                                                {ann.title}
                                            </h3>
                                            <p className="sd-ann-content" style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#475569', lineHeight: '1.6', textAlign: 'right', direction: 'rtl' }}>
                                                {ann.content}
                                            </p>

                                            <div className="sd-ann-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '10px' }}>
                                                <div className="sd-footer-dates" style={{ display: 'flex', gap: '15px' }}>
                                                    <div className="sd-meta-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                                                        <CalendarPlus size={14} style={{ color: '#3b82f6' }} />
                                                        <span>Published: {formatDate(ann.createdAt)}</span>
                                                    </div>

                                                    {ann.expiresAt && (
                                                        <div className="sd-meta-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                                                            <Clock size={14} style={{ color: '#f59e0b' }} />
                                                            <span>Expires: {formatDate(ann.expiresAt)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="sd-footer-author" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div className="sd-author-info" style={{ textAlign: 'right' }}>
                                                        <p className="sd-author-name" style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{ann.staffId?.staffName || "Admin"}</p>
                                                        <p className="sd-author-role" style={{ margin: 0, fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>{getStaffRole(ann)}</p>
                                                    </div>
                                                    <div className="sd-author-avatar" style={{ width: '32px', height: '32px', backgroundColor: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                                        <User size={18} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>

                {/* Sidebar: Meetings */}
                <aside className="sd-meetings-sidebar">
                    <div className="sd-glass-card" style={{ padding: '20px' }}>
                        <div className="sd-sidebar-header" style={{ marginBottom: '15px' }}>
                            <div className="sd-title-inline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Video size={20} color="#3b82f6" />
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>My Meetings</h3>
                            </div>
                        </div>

                        <div className="sd-mini-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {loading ? (
                                <p className="sd-loading-text">Loading...</p>
                            ) : meetings.length === 0 ? (
                                <div className="sd-empty-mini">
                                    <p style={{ fontSize: '13px', color: '#94a3b8' }}>No scheduled meetings.</p>
                                </div>
                            ) : (
                                meetings.slice(0, 4).map(meet => (
                                    <div key={meet._id} className="sd-mini-card" style={{ display: 'flex', alignItems: 'center', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', position: 'relative' }}>
                                        <div className={`sd-card-accent ${getStatusClass(meet.meetingStatus)}`} style={{ width: '4px', height: '70%', position: 'absolute', left: 0, borderRadius: '0 4px 4px 0' }}></div>
                                        <div className="sd-mini-info" style={{ flex: 1, paddingLeft: '10px' }}>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#1e293b' }}>Meeting with Advisor</h4>
                                            <div className="sd-mini-meta" style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#64748b' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Calendar size={10} /> {new Date(meet.meetingDate).toLocaleDateString()}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={10} /> {meet.meetingTime}</span>
                                            </div>
                                        </div>
                                        <div className={`sd-mini-status ${getStatusClass(meet.meetingStatus)}`} style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>
                                            {meet.meetingStatus}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <button className="sd-full-btn" onClick={() => navigate("/student/meetings")}>
                            View Schedule
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default StudentDashboard;