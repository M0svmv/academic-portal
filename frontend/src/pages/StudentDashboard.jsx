import React, { useEffect, useState } from "react";
import {
    Megaphone, Calendar, User, Video,
    ArrowRight, Clock, Bell, CalendarCheck,
    ChevronDown, Filter, AlertCircle, Bookmark, Info, AlertTriangle, BookOpen,
    GraduationCap, BookCheck, Activity, Award, TrendingUp, BarChart3
} from "lucide-react";
import { CalendarDays, CalendarPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./styles/StudentDashboard.css";

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [announcements, setAnnouncements] = useState([]);
    const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [todaySchedule, setTodaySchedule] = useState([]);
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [academicRequests, setAcademicRequests] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            const results = await Promise.allSettled([
                api.get("/student/me/announcements"),
                api.get("/student/me/meetings"),
                api.get("/student/me/profile"),
                api.get("/student/me/details"),
                api.get("/student/me/academic-requests"),
                api.get('/student/me/courses/my-schedule').catch(err => {
                    console.error("Schedule failed, returning empty data");
                    return { data: { offerings: [], schedule: [] } };
                }),
            ]);

            const [annRes, meetingRes, profileRes, detailsRes, requestsRes, scheduleRes] = results;


            if (annRes.status === 'fulfilled') {
                setAnnouncements(annRes.value.data);
                setFilteredAnnouncements(annRes.value.data);
            }

            if (meetingRes.status === 'fulfilled') setMeetings(meetingRes.value.data);

            if (profileRes.status === 'fulfilled') {
                setStudentName(profileRes.value.data.studentName || "Student");
            }

            if (detailsRes.status === 'fulfilled') setDetails(detailsRes.value.data);

            if (requestsRes.status === 'fulfilled') {
                setAcademicRequests(requestsRes.value.data.Requests || []);
            }

            // معالجة الجدول (حتى لو رجع 500 مش هيضرب الكود)
            if (scheduleRes.status === 'fulfilled' && scheduleRes.value.data?.offerings) {
                const data = scheduleRes.value.data;
                const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const todayName = daysOfWeek[new Date().getDay()];
                const periods = data.schedule[0]?.periodsTime || [];

                const todayClasses = data.offerings
                    .filter(course => course.schedule && course.schedule.days.includes(todayName))
                    .map(course => {
                        const periodIndex = course.schedule.lecPeriod - 1;
                        const timeData = periods[periodIndex];
                        return {
                            ...course,
                            time: timeData ? `${timeData.startTime} - ${timeData.endTime}` : "N/A"
                        };
                    });
                setTodaySchedule(todayClasses);
            } else {
                console.warn("Schedule data failed to load or is empty");
                setTodaySchedule([]);
            }

        } catch (err) {
            console.error("Critical Dashboard error:", err);
        } finally {
            setLoading(false);
        }
    };

    const getTimelineProgress = (start, end) => {
        const now = new Date();
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (now < startDate) return 0;
        if (now > endDate) return 100;
        return ((now - startDate) / (endDate - startDate)) * 100;
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

    const getGraduationRequirements = () => {
        const regulation = details?.transcript?.regulation?.toLowerCase();
        if (regulation === "new") {
            return { total: 165, programElective: 18, physics: 21, training: 2, project: 3 };
        }
        return { total: 185, programElective: 18, physics: 21, training: 2, project: 3 }; // "Last" regulation
    };

    const calculateProgress = (completed, total) => {
        if (!total || total === 0) return 0;
        return Math.min(Math.round((completed / total) * 100), 100);
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

    const requirements = getGraduationRequirements();

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
            <h3>Loading Your Dashboard...</h3>
        </div>
    );
    return (
        <div className="management-container sd-page-wrapper">
            <header className="sd-main-header">
                <div className="prereg-header">
                    <h2 className="sd-title">Welcome back, {details?.transcript?.studentId?.studentName}!</h2>

                    <p className="sd-subtitle" >
                        <span className={`badge level-${details?.transcript?.level}`}>{details?.transcript?.level}</span>
                        <span className={`badge reg-${details?.transcript?.regulation?.toLowerCase()}`} style={{ marginLeft: '5px' }}>
                            {details?.transcript?.regulation} Regulation
                        </span>
                        <span className="badge dept" style={{ marginLeft: '5px' }}> {details?.semester?.name || "Loading..."}</span>
                    </p>
                </div>
                {/* إضافة اسم المرشد هنا */}
                {details?.advisor && (
                    <span className="badge advisor-badge" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                        <User size={12} style={{ marginRight: '4px' }} />
                        Advisor: Dr/ {details.advisor.staffName}
                    </span>
                )}
            </header >

            <div className="insights-grid">
                {/* GPA Card */}
                <div className={`insight-card ${details?.transcript?.GPA < 2 ? 'border-danger' : ''}`}>
                    <div className="insight-header">
                        <div className={`insight-icon ${details?.transcript?.GPA < 2 ? 'red' : 'green'}`}>
                            <Activity size={18} />
                        </div>
                        <span className="insight-label">Cumulative GPA</span>
                    </div>
                    <div className="insight-value">
                        {details?.transcript?.GPA?.toFixed(2) || "0.00"}
                        <span className="insight-unit" style={{ fontSize: '14px', marginLeft: '4px', color: '#94a3b8' }}>/ 4.0</span>
                    </div>
                    <div className="mini-progress-container" style={{ height: '6px', background: '#e2e8f0', borderRadius: '10px', marginTop: '8px' }}>
                        <div
                            className="progress-fill"
                            style={{
                                width: `${(details?.transcript?.GPA / 4) * 100}%`,
                                backgroundColor: details?.transcript?.GPA < 2 ? '#ef4444' : '#10b981',
                                height: '100%',
                                borderRadius: '10px'
                            }}
                        ></div>
                    </div>
                    <div className="insight-footer">{details?.transcript?.GPA < 2 ? 'Academic Probation' : 'Good Standing'}</div>
                </div>

                {/* Completed Credits Card */}
                <div className="insight-card">
                    <div className="insight-header">
                        <div className="insight-icon blue"><BookOpen size={18} /></div>
                        <span className="insight-label">Completed Credits</span>
                    </div>
                    <div className="insight-value">
                        {details?.transcript?.completedCredits || 0}
                        <span className="insight-unit" style={{ fontSize: '14px', marginLeft: '4px', color: '#94a3b8' }}>Hrs</span>
                    </div>
                    <div className="insight-footer">Total earned credit hours</div>
                </div>

                {/* Activity Summary Card */}
                <div className="insight-card clickable" onClick={() => setActiveTab("notifications")}>
                    <div className="insight-header">
                        <div className="insight-icon orange"><Bell size={18} /></div>
                        <span className="insight-label">Activity Summary</span>
                    </div>
                    <div className="insight-value" style={{ display: 'flex', gap: '15px', alignItems: 'baseline' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{announcements.length}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>News</div>
                        </div>
                        <div style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0', paddingLeft: '15px' }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{meetings.length}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Meetings</div>
                        </div>
                        <div style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0', paddingLeft: '15px' }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{academicRequests.length}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Reqs</div>
                        </div>
                    </div>
                    <div className="insight-footer">Pending tasks & updates</div>
                </div>

                {/* Academic Alerts Card */}
                <div className={`insight-card ${details?.transcript?.alerts > 0 ? 'border-danger' : ''}`}>
                    <div className="insight-header">
                        <div className={`insight-icon ${details?.transcript?.alerts > 0 ? 'red' : 'gray'}`}>
                            {details?.transcript?.alerts > 0 ? <AlertTriangle size={18} /> : <Info size={18} />}
                        </div>
                        <span className="insight-label">Academic Alerts</span>
                    </div>
                    <div className="insight-value" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <span style={{ fontSize: '20px' }}>{details?.transcript?.alerts || 0}</span>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}> Cons.</span>
                        </div>
                        <div style={{ borderRight: '1px solid #e2e8f0' }}></div>
                        <div>
                            <span style={{ fontSize: '20px' }}>{details?.transcript?.totalAlerts || 0}</span>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}> Total</span>
                        </div>
                    </div>
                    <div className="insight-footer">
                        {details?.transcript?.alerts >= 3 ? 'Warning: Near dismissal' : 'Status: Stable'}
                    </div>
                </div>
            </div>
            {/* Semester Timeline Section */}
            {!loading && details?.semester && (
                <div className="st-container">
                    <div className="st-glass-card-main">
                        <div className="st-header">
                            <div className="st-title-wrapper">
                                {/* تم تغيير اللون للأزرق السماوي ليعبر عن الوقت والجدولة */}
                                <Calendar className="st-icon-primary" size={20} color="#0ea5e9" />
                                <h3 className="sd-section-heading">Semester Timeline: {details.semester.name || details.semester._id}</h3>
                            </div>
                        </div>

                        <div className="st-milestones-grid">
                            {Object.entries(details.semester.timeLine || {}).map(([key, dates]) => {
                                const progress = getTimelineProgress(dates.start, dates.end);
                                const isActive = progress > 0 && progress < 100;
                                const isDone = progress === 100;

                                const daysLeft = Math.ceil((new Date(dates.end) - new Date()) / (1000 * 60 * 60 * 24));

                                return (
                                    <div key={key} className={`st-liquid-card ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}>
                                        <div className="st-liquid-fill" style={{ height: `${progress}%` }} />

                                        <div className="st-card-content">
                                            <div className="st-card-header">
                                                <span className="st-label">{key.replace(/([A-Z])/g, ' $1')}</span>
                                                {isDone ? (
                                                    <CheckCircle2 size={16} className="st-status-done" strokeWidth={3} />
                                                ) : isActive ? (
                                                    <div className="st-pulse-indicator" />
                                                ) : null}
                                            </div>

                                            <div className="st-date-text">
                                                {formatDate(dates.start)} — {formatDate(dates.end)}
                                            </div>

                                            {isActive && daysLeft > 0 && (
                                                <div className="st-timer-badge">
                                                    <Clock size={13} strokeWidth={2.5} />
                                                    <span>{daysLeft} {daysLeft === 1 ? 'Day' : 'Days'} Left</span>
                                                </div>
                                            )}

                                            {isDone && (
                                                <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '700', marginTop: '8px' }}>
                                                    COMPLETED
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}


            {
                !loading && details && (
                    <div className="sd-insights-section">
                        <div className="sd-glass-card sd-insights-card">
                            <div className="sd-section-header-flex">
                                <div className="sd-section-title-box">
                                    {/* لون موف (Indigo) يعبر عن الذكاء والبيانات التحليلية */}
                                    <BarChart3 className="sd-primary-icon" size={20} color="#6366f1" />
                                    <h3 className="sd-section-heading">Academic Insights & Progress</h3>
                                </div>
                            </div>

                            <div className="sd-insights-grid">
                                {/* Detailed Degree Progress with Scroll */}
                                <div className="sd-insight-group">
                                    <h4 className="sd-insight-subheading">Degree Progress Breakdown</h4>
                                    <div className="sd-progress-scroll-area">
                                        {/* Overall Progress */}
                                        <div className="sd-progress-item">
                                            <div className="sd-progress-label-flex">
                                                <span>Total Credits (Graduation)</span>
                                                <span>{details.transcript?.completedCredits} / {requirements.total}</span>
                                            </div>
                                            <div className="sd-progress-bar-bg">
                                                <div
                                                    className="sd-progress-bar-fill progress-success"
                                                    style={{ width: `${calculateProgress(details.transcript?.completedCredits, requirements.total)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Core Credits */}
                                        <div className="sd-progress-item">
                                            <div className="sd-progress-label-flex">
                                                <span>Core Courses Progress</span>
                                                <span>{details.transcript?.coreCompletedCredits} / 72</span>
                                            </div>
                                            <div className="sd-progress-bar-bg">
                                                <div
                                                    className="sd-progress-bar-fill"
                                                    style={{ width: `${calculateProgress(details.transcript?.coreCompletedCredits, 72)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Program Electives */}
                                        <div className="sd-progress-item">
                                            <div className="sd-progress-label-flex">
                                                <span>Program Electives</span>
                                                <span>{details.transcript?.electiveProgramCompletedCredits} / {requirements.programElective}</span>
                                            </div>
                                            <div className="sd-progress-bar-bg">
                                                <div
                                                    className="sd-progress-bar-fill accent-purple"
                                                    style={{ width: `${calculateProgress(details.transcript?.electiveProgramCompletedCredits, requirements.programElective)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Physics Credits */}
                                        <div className="sd-progress-item">
                                            <div className="sd-progress-label-flex">
                                                <span>Engineering Physics</span>
                                                <span>{details.transcript?.engPhysicsCompletedCredits} / {requirements.physics}</span>
                                            </div>
                                            <div className="sd-progress-bar-bg">
                                                <div
                                                    className="sd-progress-bar-fill accent-orange"
                                                    style={{ width: `${calculateProgress(details.transcript?.engPhysicsCompletedCredits, requirements.physics)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Training & Project */}
                                        <div className="sd-dual-progress-flex">
                                            <div className="sd-progress-item half">
                                                <div className="sd-progress-label-flex"><span>Training</span><span>{details.transcript?.trainingCompletedCredits}/2</span></div>
                                                <div className="sd-progress-bar-bg"><div className="sd-progress-bar-fill accent-green" style={{ width: `${calculateProgress(details.transcript?.trainingCompletedCredits, 2)}%` }}></div></div>
                                            </div>
                                            <div className="sd-progress-item half">
                                                <div className="sd-progress-label-flex"><span>Grad. Project</span><span>{details.transcript?.graduationProjectCompletedCredits}/3</span></div>
                                                <div className="sd-progress-bar-bg"><div className="sd-progress-bar-fill accent-green" style={{ width: `${calculateProgress(details.transcript?.graduationProjectCompletedCredits, 3)}%` }}></div></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Current Semester Performance */}
                                <div className="sd-insight-group">
                                    <h4 className="sd-insight-subheading">Current Semester Works</h4>
                                    <div className="sd-semester-works-mini-grid">
                                        {details.semesterWorks?.length > 0 ? (
                                            details.semesterWorks.map((work) => (
                                                <div key={work._id} className="sd-work-badge">
                                                    <span className="sd-work-course-code">{work.courseId?.courseName || "Course"}</span>
                                                    <div className="sd-work-progress-circle">
                                                        <span className="sd-work-grade-val">{work.grade?.totalGrade || 0}%</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="sd-no-data-text">No grades recorded yet.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            <div className="sd-content-layout">
                <main className="sd-announcements-area">
                    <div className="sd-glass-card sd-announcements-card">
                        <div className="sd-section-header-flex">
                            <div className="sd-section-title-box">
                                {/* لون برتقالي محمر يعبر عن التنبيهات والإعلانات */}
                                <Megaphone className="sd-primary-icon" size={20} color="#f43f5e" />
                                <h3 className="sd-section-heading">Recent Announcements</h3>
                            </div>

                            <div className="sd-filter-dropdown-container">
                                <div className="sd-select-wrapper">
                                    <select
                                        className="sd-custom-select"
                                        value={activeTab}
                                        onChange={(e) => handleTabChange(e.target.value)}
                                    >
                                        {filterOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <Filter className="sd-filter-icon" size={16} />
                                </div>
                            </div>
                        </div>

                        {filteredAnnouncements.length === 0 ? (
                            <div className="sd-empty-state" style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.4)', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                <Megaphone size={32} style={{ color: '#94a3b8', marginBottom: '10px' }} />
                                <p style={{ color: '#64748b', fontWeight: '500' }}>No announcements for this course yet.</p>
                            </div>
                        ) : (
                            <div className="sd-cards-stack" >
                                {filteredAnnouncements.map((ann) => {
                                    return (
                                        <div key={ann._id} className={`sd-ann-item ${ann.isPinned ? 'sd-pinned' : ''}`} >
                                            <div className="sd-ann-header-flex">
                                                <div className="sd-header-badges">
                                                    <span className={`sd-pill-tag ${getTagClass(ann.target)}`} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#e0e7ff', color: '#4338ca' }}>
                                                        {getTargetLabel(ann.target)}
                                                    </span>
                                                    <span style={getTypeBadgeStyle(ann.type)}>
                                                        {getTypeIcon(ann.type)}
                                                        {ann.type}
                                                    </span>
                                                </div>
                                                <span className="sd-semester-text">
                                                    {ann.semesterId?.name || ann.semesterId}
                                                </span>
                                            </div>

                                            {ann.courseId && (
                                                <div className="sd-course-context">
                                                    <BookOpen size={14} />
                                                    <span>{ann.courseId.courseId?.courseName || "Course Update"}</span>
                                                </div>
                                            )}

                                            <h3 className="sd-ann-title">
                                                {ann.title}
                                            </h3>
                                            <p className="sd-ann-content">
                                                {ann.content}
                                            </p>

                                            <div className="sd-ann-footer-flex">
                                                <div className="sd-footer-dates">
                                                    <div className="sd-meta-item">
                                                        <CalendarPlus size={14} style={{ color: '#3b82f6' }} />
                                                        <span>Published: {formatDate(ann.createdAt)}</span>
                                                    </div>

                                                    {ann.expiresAt && (
                                                        <div className="sd-meta-item">
                                                            <Clock size={14} style={{ color: '#f59e0b' }} />
                                                            <span>Expires: {formatDate(ann.expiresAt)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="sd-footer-author">
                                                    <div className="sd-author-info">
                                                        <p className="sd-author-name">{ann.staffId?.staffName || "Admin"}</p>
                                                        <p className="sd-author-role">{getStaffRole(ann)}</p>
                                                    </div>
                                                    <div className="sd-author-avatar">
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

                <aside className="sd-meetings-sidebar">
                    <div className="sd-glass-card sd-today-schedule sd-sidebar-card">
                        <div className="sd-sidebar-header">
                            <div className="sd-title-inline">
                                <CalendarDays size={20} color="#d97706" />
                                <h3 className="sd-section-heading">Today's Classes</h3>
                            </div>
                        </div>

                        <div className="sd-mini-list">
                            {loading ? (
                                <p className="sd-loading-text">Loading Schedule...</p>
                            ) : todaySchedule.length === 0 ? (
                                <div className="sd-empty-schedule">
                                    <p>No classes today. Enjoy your day!</p>
                                </div>
                            ) : (
                                todaySchedule.map((item, idx) => (
                                    <div key={idx} className="sd-schedule-item">
                                        <div className="sd-course-time-box">
                                            <div className="sd-time-badge">
                                                <Clock size={10} />
                                                {item.time}
                                            </div>
                                            <span className="sd-period-tag">Period {item.schedule.lecPeriod}</span>
                                        </div>
                                        <h4 className="sd-course-name-sm">{item.courseId.courseName}</h4>
                                    </div>
                                ))
                            )}
                        </div>
                        <button className="sd-full-btn sd-view-schedule-btn" onClick={() => navigate("/student/St-Schedule")}>
                            View Schedule
                        </button>
                    </div>

                    {/* My Meetings Sidebar Card */}
                    <div className="sd-glass-card sd-sidebar-card">
                        <div className="sd-sidebar-header">
                            <div className="sd-title-inline">
                                {/* لون تيل (Teal) يعبر عن التواصل والاجتماعات الهادئة */}
                                <Video size={20} color="#0d9488" />
                                <h3 className="sd-section-heading">My Meetings</h3>
                            </div>
                        </div>

                        <div className="sd-mini-list">
                            {loading ? (
                                <p className="sd-loading-text">Loading...</p>
                            ) : meetings.length === 0 ? (
                                <div className="sd-empty-mini">
                                    <p className="sd-empty-mini-text">No scheduled meetings.</p>
                                </div>
                            ) : (
                                <>
                                    {meetings.slice(0, 3).map(meet => (
                                        <div key={meet._id} className="sd-mini-card">
                                            <div className={`sd-card-accent ${getStatusClass(meet.meetingStatus)}`}></div>
                                            <div className="sd-mini-info">
                                                <h3 className="sd-author-name">Meet with Dr/ {meet.advisorId?.staffName}</h3>
                                                <div className="sd-mini-meta">
                                                    <span><Calendar size={10} /> {new Date(meet.meetingDate).toLocaleDateString()}</span>
                                                    <span><Clock size={10} /> {meet.meetingTime}</span>
                                                </div>
                                            </div>
                                            <div className={`sd-mini-status ${getStatusClass(meet.meetingStatus)}`}>
                                                {meet.meetingStatus}
                                            </div>
                                        </div>
                                    ))}
                                    {/* Fade effect indicator if more than 3 */}
                                    {meetings.length > 3 && <div className="sd-list-fade-edge"></div>}
                                </>
                            )}
                        </div>

                        <button className="sd-full-btn" onClick={() => navigate("/student/meetings")}>
                            View All Meetings {meetings.length > 3 && <span className="sd-btn-badge">+{meetings.length - 3} more</span>}
                        </button>
                    </div>

                    {/* Academic Requests Sidebar Card */}
                    <div className="sd-glass-card sd-sidebar-card">
                        <div className="sd-sidebar-header">
                            <div className="sd-title-inline">
                                {/* لون أخضر زمردي (Emerald) يعبر عن النجاح والتخرج والطلبات الرسمية */}
                                <GraduationCap size={20} color="#059669" />
                                <h3 className="sd-section-heading">Academic Requests</h3>
                            </div>
                        </div>
                        <div className="sd-mini-list">
                            {loading ? (
                                <p className="sd-loading-text">Loading...</p>
                            ) : academicRequests.length === 0 ? (
                                <div className="sd-empty-mini">
                                    <p className="sd-empty-mini-text">No requests found.</p>
                                </div>
                            ) : (
                                <>
                                    {academicRequests.slice(0, 3).map(req => (
                                        <div key={req._id} className="sd-mini-card">
                                            <div className={`sd-card-accent ${getStatusClass(req.status)}`}></div>
                                            <div className="sd-mini-info">
                                                <div className="sd-request-header">
                                                    <h3 className="sd-author-name">{req.requestType}</h3>
                                                    <span className={`sd-status-dot ${req.status}`}></span>
                                                </div>
                                                <div className="sd-mini-meta">
                                                    <p className="sd-author-role" style={{ fontSize: '11px' }}>
                                                        {req.courseId?.courseName || req.withdrawalReason || "General Request"}
                                                    </p>
                                                    <span><Clock size={10} /> {formatDate(req.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {academicRequests.length > 3 && <div className="sd-list-fade-edge"></div>}
                                </>
                            )}
                        </div>
                        <button className="sd-full-btn" onClick={() => navigate("/student/requests")}>
                            Manage Requests {academicRequests.length > 3 && <span className="sd-btn-badge">+{academicRequests.length - 3} more</span>}
                        </button>
                    </div>
                </aside>
            </div >
        </div >
    );
};

export default StudentDashboard;