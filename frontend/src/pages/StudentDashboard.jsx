import React, { useEffect, useState } from "react";
import {
    Megaphone, Calendar, User, Video,
    ArrowRight, Clock, Bell, CalendarCheck,
    ChevronDown, Filter
} from "lucide-react";
import { CalendarDays, CalendarPlus, } from 'lucide-react';
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
            // "all" تعيد كافة الإعلانات التي تم جلبها في البداية
            if (tabType === "all") {
                setFilteredAnnouncements(announcements);
                setLoading(false);
                return;
            }

            // تصفية بناءً على الـ target المذكور في الـ Schema
            let filtered;
            if (tabType === "advisingList") {
                // جلب إعلانات قائمة الإرشاد من السيرفر مباشرة لضمان الدقة
                const res = await api.get("/student/me/advising-list-announcements");
                setFilteredAnnouncements(res.data);
                setLoading(false);
                return;
            } else if (tabType === "specificStudents") {
                // الإعلانات الموجهة للطالب بشكل خاص (Private)
                filtered = announcements.filter(a => a.target === "specificStudents");
            } else if (tabType === "all-public") {
                // الإعلانات العامة للجميع
                filtered = announcements.filter(a => a.target === "all");
            } else if (tabType === "academic") {
                // الإعلانات المتعلقة بالمستويات أو الكورسات
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

            <div className=" sd-content-layout">
                {/* Main Content: Announcements */}
                <main className="sd-announcements-area">
                    <div className="sd-glass-card">
                        <div className="sd-section-header flex justify-between items-center mb-6">
                            <div className="sd-section-title-box flex items-center gap-2">
                                <Megaphone className="sd-primary-icon" size={24} />
                                <h2 className="text-xl font-bold">Recent Announcements</h2>
                            </div>

                            {/* Dropdown Filter */}
                            <div className="sd-filter-dropdown-container relative">
                                <div className="relative group">
                                    <select
                                        className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-10 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer transition-all text-sm font-medium"
                                        value={activeTab}
                                        onChange={(e) => handleTabChange(e.target.value)}
                                    >
                                        {filterOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>


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
                            <div className="sd-cards-stack">
                                {filteredAnnouncements.map((ann) => (
                                    <div key={ann._id} className="sd-ann-item">
                                        <div className="sd-ann-header">
                                            <span className={`sd-pill-tag ${getTagClass(ann.target)}`}>
                                                {getTargetLabel(ann.target)}
                                            </span>
                                            <span className="sd-semester-text">{ann.semesterId?.name || ann.semesterId}</span>
                                        </div>
                                        <h3 className="sd-ann-title">{ann.title}</h3>
                                        <p className="sd-ann-content">{ann.content}</p>
                                        <div className="sd-ann-footer flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-slate-500">

                                            {/* تاريخ النشر */}
                                            <div className="sd-meta-item flex items-center gap-1.5 text-xs font-medium">
                                                <CalendarPlus size={14} className="text-blue-500" />
                                                <span>Published: {formatDate(ann.createdAt)}</span>
                                            </div>

                                            {/* تاريخ الانتهاء */}
                                            <div className="sd-meta-item flex items-center gap-1.5 text-xs font-medium">
                                                <Clock size={14} className="text-amber-500" />
                                                <span>Expires: {formatDate(ann.expiresAt)}</span>
                                            </div>

                                            {/* الناشر */}
                                            <div className="sd-meta-item flex items-center gap-1.5 text-xs font-medium ml-auto">
                                                <User size={14} className="text-slate-400" />
                                                <span className="bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {ann.staffId?.staffName || "Admin"}
                                                </span>
                                            </div>

                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                {/* Sidebar: Meetings */}
                <aside className="sd-meetings-sidebar">
                    <div className="sd-glass-card">
                        <div className="sd-sidebar-header">
                            <div className="sd-title-inline">
                                <Video size={20} className="sd-primary-icon" />
                                <h3>My Meetings</h3>
                            </div>
                        </div>

                        <div className="sd-mini-list">
                            {loading ? (
                                <p className="sd-loading-text">Loading...</p>
                            ) : meetings.length === 0 ? (
                                <div className="sd-empty-mini">
                                    <p>No scheduled meetings.</p>
                                </div>
                            ) : (
                                meetings.slice(0, 4).map(meet => (
                                    <div key={meet._id} className="sd-mini-card">
                                        <div className={`sd-card-accent ${getStatusClass(meet.meetingStatus)}`}></div>
                                        <div className="sd-mini-info">
                                            <h4>Meeting with Advisor</h4>
                                            <div className="sd-mini-meta">
                                                <span><Calendar size={12} /> {new Date(meet.meetingDate).toLocaleDateString()}</span>
                                                <span><Clock size={12} /> {meet.meetingTime}</span>
                                            </div>
                                        </div>
                                        <div className={`sd-mini-status ${getStatusClass(meet.meetingStatus)}`}>
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