import { useParams, useNavigate } from "react-router-dom";
import React, { useEffect, useState, useMemo } from "react";
import {
    Megaphone, Calendar, User, Video,
    ArrowRight, Clock, Bell, CalendarCheck,
    ChevronDown, Filter, AlertCircle, Bookmark, Info, AlertTriangle, BookOpen, Mail, UserCheck,
    GraduationCap, BookCheck, Activity, Award, TrendingUp, BarChart3, Users, Scale, Star, LayoutGrid, GitBranch, ListPlus, UserMinus,
    CalendarDays, CalendarPlus, Loader2, CheckCircle2, PieChart as PieIcon
} from "lucide-react";

import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    AreaChart, Area
} from 'recharts';
import api from "../../services/api";
import "../coordinator pages/styles/cooDashbord.css"

const AdvisorDashboard = () => {
    const { role } = useParams();
    const navigate = useNavigate();
    const [semesters, setSemesters] = useState([]);
    const [currentSemester, setCurrentSemester] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileData, setprofileData] = useState({});
    const [students, setStudents] = useState([]);
    const [cardLevelView, setCardLevelView] = useState('all');
    const [cardRegView, setCardRegView] = useState('all');
    const [courses, setCourses] = useState([]);
    const [insightLevel, setInsightLevel] = useState('all');
    const [insightType, setInsightType] = useState('Core');
    const [staff, setStaff] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [roleView, setRoleView] = useState('all');
    const VALID_LEVELS = ["freshman", "sophomore", "junior", "senior-1", "senior-2", "senior"];
    const VALID_TYPES = [
        "Core", "Program Elective", "General Elective 1", "General Elective 2",
        "General Elective 3", "Engineering Economy Elective", "Project Management Elective",
        "Engineering Physics Elective", "Engineering Mathematics Elective",
        "graduation-project", "training"
    ];
    const [stats, setStats] = useState({
        totalAdvisors: 0,
        unassignedStudents: 0,
        emptyLists: 0,
        staffAvailable: 0
    });

    const [announcements, setAnnouncements] = useState([]);
    const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
    const [academicRequests, setAcademicRequests] = useState([]);
    const [activeTab, setActiveTab] = useState("all");

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    fetchAllSemesters(),
                    fetchUserData(),
                    fetchStudents(),
                    fetchDashboardData()
                ]);
            } catch (err) {
                console.error("Error loading dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadAllData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            const [annRes, meetingRes, requestsRes] = await Promise.all([
                api.get("/academic-advisors/me/advising-list/announcements"),
                api.get("/academic-advisors/me/meetings"),
                api.get("/academic-requests/all")
            ]);

            setAnnouncements(annRes.data);
            setMeetings(meetingRes.data);
            setFilteredAnnouncements(annRes.data);
            setAcademicRequests(requestsRes.data.Requests || []);


        } catch (err) {
            console.error("Dashboard error:", err);

        }
    };

    const fetchStudents = async () => {
        try {
            const res = await api.get("/academic-advisors/me/list");


            const allStudentsRaw = res.data.flatMap(item => item.students.map(s => s.student)) || [];
            setStudents(allStudentsRaw);
        } catch (err) {
            console.error("Error fetching students for insights:", err);
        }
    };


    const studentLevelData = useMemo(() => {
        return VALID_LEVELS.map(level => ({
            name: level.charAt(0).toUpperCase() + level.slice(1),
            value: students.filter(s => s.transcript?.level === level).length
        })).filter(item => item.value > 0);
    }, [students]);

    const regulationData = useMemo(() => {
        const regs = ["New", "last"];
        return regs.map(reg => ({
            name: reg + " Regulation",
            value: students.filter(s => s.transcript?.regulation === reg).length
        })).filter(item => item.value > 0);
    }, [students]);


    const gpaDistributionData = useMemo(() => {
        const ranges = [
            { range: '0-1', count: 0 },
            { range: '1-2', count: 0 },
            { range: '2-3', count: 0 },
            { range: '3-3.5', count: 0 },
            { range: '3.5-4', count: 0 }
        ];
        students.forEach(s => {
            const g = s.transcript?.GPA || 0;
            if (g < 1) ranges[0].count++;
            else if (g < 2) ranges[1].count++;
            else if (g < 3) ranges[2].count++;
            else if (g < 3.5) ranges[3].count++;
            else ranges[4].count++;
        });
        return ranges;
    }, [students]);


    const courseTypeData = useMemo(() => {
        return VALID_TYPES.map(type => ({
            subject: type.length > 15 ? type.substring(0, 12) + '...' : type,
            A: courses.filter(c => c.courseType === type).length,
            fullMark: Math.max(...VALID_TYPES.map(t => courses.filter(c => c.courseType === t).length)) + 1
        }));
    }, [courses]);

    const staffRoleData = useMemo(() => {
        const roles = ['admin', 'coordinator', 'academic-advisor', 'lecturer', 'ta'];
        return roles.map(r => ({
            role: r.replace('-', ' '),
            count: staff.filter(s => s.roles.includes(r)).length
        }));
    }, [staff]);

    const averageGPA = (students.reduce((sum, s) => sum + (s.transcript?.GPA || 0), 0) / (students.length || 1)).toFixed(2);

    const fetchUserData = async () => {
        try {
            const response = await api.get("/staff/me");
            setprofileData(response.data);
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    };

    const fetchAllSemesters = async () => {
        try {
            const res = await api.get("/semesters/current");


            setCurrentSemester(res.data);

        } catch (err) {
            console.error(err);
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

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };


    const renderInsightCard = ({ icon: Icon, label, value, footer, colorClass, select, onClick, className = "" }) => (
        <div className={`insight-card-v2 ${colorClass} ${onClick ? 'clickable' : ''} ${className}`} onClick={onClick}>
            <div className="card-top">
                <div className="icon-box"><Icon size={20} /></div>
                <div className="label-area">
                    {select ? select : <span className="label-text">{label}</span>}
                </div>
            </div>
            <div className="card-mid">
                <span className="value-text">{value}</span>
            </div>
            <div className="card-bottom">
                <span className="footer-text">{footer}</span>
            </div>
        </div>
    );

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
    const filterOptions = [
        { id: "all", label: "All Announcements" },
        { id: "all-public", label: "Public Announcements" },
        { id: "advisingList", label: "Advising List" },
        { id: "specificStudents", label: "Private (Specific)" },
        { id: "academic", label: "Academic (Course/Level)" }
    ];


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
        <div className="management-container">
            <header className="sd-main-header">
                <div className="prereg-header">
                    <h2 >Welcome back, {profileData?.staffName}!</h2>
                    <p className="sd-subtitle">
                        <span className="badge dept" style={{ marginLeft: '5px' }}> {currentSemester?.name || "No semester opened"}</span>
                    </p>
                </div>
            </header>
            {/* --- SEMESTER TIMELINE --- */}
            {currentSemester && (
                <div className="st-container">
                    <div className="st-glass-card-main">
                        <div className="st-header">
                            <div className="st-title-wrapper">

                                <h3 className="sd-section-heading">Semester Timeline: {currentSemester.name || currentSemester._id}</h3>
                            </div>
                        </div>
                        <div className="st-milestones-grid">
                            {Object.entries(currentSemester.timeLine || {}).map(([key, dates]) => {
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
                                                {isDone ? <CheckCircle2 size={16} className="st-status-done" /> : isActive ? <div className="st-pulse-indicator" /> : null}
                                            </div>
                                            <div className="st-date-text">{formatDate(dates.start)} — {formatDate(dates.end)}</div>
                                            {isActive && daysLeft > 0 && (
                                                <div className="st-timer-badge">
                                                    <Clock size={12} /> <span>{daysLeft}d left</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* --- SECTION 1: STUDENT VISUALIZATIONS --- */}
            <h3 className="section-divider-title"> Student Analytics</h3>
            <div className="charts-main-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Pie Chart for Levels */}
                <div className="chart-container-card">
                    <h4>Student Distribution (Levels)</h4>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={studentLevelData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {studentLevelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart for Regulation */}
                <div className="chart-container-card">
                    <h4>Regulation Distribution</h4>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={regulationData}
                                    innerRadius={0}
                                    outerRadius={80}
                                    dataKey="value"
                                    label
                                >
                                    {regulationData.map((entry, index) => (
                                        <Cell key={`cell-reg-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bar Chart for GPA */}
                <div className="chart-container-card">
                    <h4>GPA Performance Range</h4>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={gpaDistributionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="range" />
                                <YAxis />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="insights-grid-v2">
                {renderInsightCard({
                    icon: Users,
                    label: "Total Students",
                    value: students.length,
                    footer: "Assigned in your list",
                    colorClass: "blue-grad"
                })}
                {renderInsightCard({
                    icon: AlertTriangle,
                    label: "At Risk Students",
                    value: students.filter(s => s.transcript?.atRisk).length,
                    footer: "Requires urgent follow-up",
                    colorClass: "orange-grad"
                })}
                {renderInsightCard({
                    icon: UserMinus,
                    label: "Unregistered Students",
                    value: students.filter(s => s.registeredCredits === 0).length,
                    footer: "Requires follow-up",
                    colorClass: "red-grad"
                })}
                {renderInsightCard({
                    icon: Star,
                    label: "Average GPA",
                    value: averageGPA,
                    footer: "Overall student performance",
                    colorClass: "purple-grad"
                })}

            </div>


            <div className="sd-content-layout">
                <main className="sd-announcements-area">
                    <div className="sd-glass-card sd-announcements-card">
                        <div className="sd-section-header-flex">
                            <div className="sd-section-title-box">
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
                                <p style={{ color: '#64748b', fontWeight: '500' }}>No announcements for this category yet.</p>
                            </div>
                        ) : (
                            <div className="sd-cards-stack">
                                {filteredAnnouncements.map((ann) => {


                                    return (
                                        <div key={ann._id || Math.random()} className={`sd-ann-item ${ann.isPinned ? 'sd-pinned' : ''}`}>
                                            <div className="sd-ann-header-flex">
                                                <div className="sd-header-badges">
                                                    <span className={`sd-pill-tag ${getTagClass?.(ann.target)}`} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#e0e7ff', color: '#4338ca' }}>
                                                        {getTargetLabel ? getTargetLabel(ann.target) : ann.target}
                                                    </span>
                                                    <span style={getTypeBadgeStyle ? getTypeBadgeStyle(ann.type) : {}}>
                                                        {getTypeIcon?.(ann.type)}
                                                        {ann.type}
                                                    </span>
                                                </div>
                                                <span className="sd-semester-text">

                                                    {typeof ann.semesterId === 'object' ? ann.semesterId?.name : ann.semesterId}
                                                </span>
                                            </div>

                                            {ann.courseId && (
                                                <div className="sd-course-context">
                                                    <BookOpen size={14} />
                                                    <span>{ann.courseId?.courseId?.courseName || ann.courseId?.courseName || "Course Update"}</span>
                                                </div>
                                            )}

                                            <h3 className="sd-ann-title">
                                                {ann.title || "Untitled Announcement"}
                                            </h3>
                                            <p className="sd-ann-content">
                                                {ann.content}
                                            </p>

                                            <div className="sd-ann-footer-flex">
                                                <div className="sd-footer-dates">
                                                    <div className="sd-meta-item">
                                                        <CalendarPlus size={14} style={{ color: '#3b82f6' }} />
                                                        <span>Published: {formatDate ? formatDate(ann.createdAt) : ann.createdAt}</span>
                                                    </div>

                                                    {ann.expiresAt && (
                                                        <div className="sd-meta-item">
                                                            <Clock size={14} style={{ color: '#f59e0b' }} />
                                                            <span>Expires: {formatDate ? formatDate(ann.expiresAt) : ann.expiresAt}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="sd-footer-author">
                                                    <div className="sd-author-info">
                                                        <p className="sd-author-name">
                                                            {ann.staffId?.staffName || (typeof ann.staffId === 'string' ? ann.staffId : "Admin")}
                                                        </p>
                                                        <p className="sd-author-role">{getStaffRole ? getStaffRole(ann) : 'Staff'}</p>
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

                    {/* My Meetings Sidebar Card */}
                    <div className="sd-glass-card sd-sidebar-card">
                        <div className="sd-sidebar-header">
                            <div className="sd-title-inline">

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
                                                <h3 className="sd-author-name">Meet with {meet.studentId?.studentName?.length > 20
                                                    ? `${meet.studentId.studentName.substring(0, 12)}...`
                                                    : meet.studentId?.studentName}</h3>
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
                                    {meetings.length > 3 && <div className="sd-list-fade-edge"></div>}
                                </>
                            )}
                        </div>

                        <button className="sd-full-btn" onClick={() => navigate("/staff/academic-advisor/ad-meetings")}>
                            View All Meetings {meetings.length > 3 && <span className="sd-btn-badge">+{meetings.length - 3} more</span>}
                        </button>
                    </div>
                    {/* Academic Requests Sidebar Card */}
                    <div className="sd-glass-card sd-sidebar-card">
                        <div className="sd-sidebar-header">
                            <div className="sd-title-inline">
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
                        <button className="sd-full-btn" onClick={() => navigate("/staff/academic-advisor/Adv-Requests")}>
                            Manage Requests {academicRequests.length > 3 && <span className="sd-btn-badge">+{academicRequests.length - 3} more</span>}
                        </button>
                    </div>
                </aside>
            </div >

        </div>
    );
};

export default AdvisorDashboard;