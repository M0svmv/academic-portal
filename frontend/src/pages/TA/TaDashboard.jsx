import { useParams, useNavigate } from "react-router-dom";
import React, { useEffect, useState, useMemo } from "react";
import {
    Megaphone, Calendar, User, Video,
    ArrowRight, Clock, Bell, CalendarCheck,
    ChevronDown, Filter, AlertCircle, Bookmark, Info, AlertTriangle, BookOpen, Mail, UserCheck,
    GraduationCap, BookCheck, Activity, Award, TrendingUp, BarChart3, Users, Scale, Star, LayoutGrid, GitBranch, ListPlus,
    CalendarDays, CalendarPlus, Loader2, CheckCircle2, PieChart as PieIcon
} from "lucide-react";

import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import api from "../../services/api";
import "../coordinator pages/styles/cooDashbord.css"

const TaDashboard = () => {
    const { role } = useParams();
    const navigate = useNavigate();
    const [semesters, setSemesters] = useState([]);
    const [currentSemester, setCurrentSemester] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileData, setprofileData] = useState({});
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [studentsData, setStudentsData] = useState([]);
    const [todaySchedule, setTodaySchedule] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
    const [activeTab, setActiveTab] = useState("all");
    const [statsCourseFilter, setStatsCourseFilter] = useState("all");

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

    // --- Logic for Insights & Charts ---
    const processedStats = useMemo(() => {
        const levels = {};
        const regs = {};


        if (courses && courses.length > 0) {
            courses.forEach(c => {
                if (statsCourseFilter === "all" || c._id === statsCourseFilter) {
                    const lvl = c.courseId?.courseLevel || "Unknown";
                    const reg = c.courseId?.courseRegulation || "Other";
                    const count = c.enrolledCount || 0;

                    if (count > 0) {
                        levels[lvl] = (levels[lvl] || 0) + count;
                        regs[reg] = (regs[reg] || 0) + count;
                    }
                }
            });
        }

        let enrollment = 0;
        let credits = 0;
        courses.forEach(c => {
            enrollment += (c.enrolledCount || 0);
            credits += (c.courseId?.courseCredits || 0);
        });

        return {
            levelDist: Object.keys(levels).map(key => ({ name: `Level ${key}`, value: levels[key] })),
            regDist: Object.keys(regs).map(key => ({ name: key, value: regs[key] })),
            totalEnrollment: enrollment,
            totalCredits: credits,
            activeCount: courses.length
        };
    }, [courses, statsCourseFilter]);

    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    fetchAllSemesters(),
                    fetchUserData(),
                    fetchCourses()
                ]);
            } catch (err) {
                console.error("Error loading dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };
        loadAllData();
    }, []);

    useEffect(() => {
        if (selectedCourseId) {
            fetchDashboardData();
            fetchCourseStudents(selectedCourseId);
        }
    }, [selectedCourseId]);

    const fetchCourses = async () => {
        try {
            const res = await api.get("/tas/me/courses");
            const coursesData = Array.isArray(res.data) ? res.data : [];
            setCourses(coursesData);
            if (coursesData.length > 0) {
                setSelectedCourseId(coursesData[0]._id);
                setStatsCourseFilter(coursesData[0]._id);
            }
        } catch (err) {
            console.error("Error fetching courses:", err);
        }
    };

    const fetchCourseStudents = async (courseId) => {
        try {
            const res = await api.get(`/semester-work/course/${courseId}`);
            setStudentsData(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Error fetching students for graph:", err);
            setStudentsData([]);
        }
    };

    const fetchDashboardData = async () => {
        try {
            const [annRes, scheduleRes] = await Promise.all([
                api.get(`/tas/me/courses/${selectedCourseId}/announcements`),
                api.get('/tas/me/courses/schedule'),
            ]);

            setAnnouncements(annRes.data);
            setFilteredAnnouncements(annRes.data);

            if (scheduleRes.data && scheduleRes.data.offerings) {
                const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const todayName = daysOfWeek[new Date().getDay()];
                const periods = scheduleRes.data.schedule[0]?.periodsTime || [];

                const todayClasses = scheduleRes.data.offerings
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
            }
        } catch (err) {
            console.error("Dashboard error:", err);
        }
    };

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
            day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    const handleTabChange = async (tabType) => {
        setActiveTab(tabType);
        if (tabType === "all") {
            setFilteredAnnouncements(announcements);
            return;
        }
        const filtered = announcements.filter(a => a.target === tabType);
        setFilteredAnnouncements(filtered);
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
            case "course": return "sd-tag-academic";
            case "all": return "sd-tag-public";
            default: return "sd-tag-dept";
        }
    };

    const getTargetLabel = (target) => {
        switch (target) {
            case "all": return "Public";
            case "course": return "Course";
            default: return target;
        }
    };

    const getTypeBadgeStyle = (type) => {
        const base = { display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", marginLeft: "8px" };
        switch (type) {
            case "urgent": return { ...base, backgroundColor: "#fee2e2", color: "#dc2626" };
            case "deadline": return { ...base, backgroundColor: "#fef3c7", color: "#d97706" };
            default: return { ...base, backgroundColor: "#e0f2fe", color: "#0284c7" };
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case "urgent": return <AlertCircle size={12} />;
            case "deadline": return <Clock size={12} />;
            default: return <Info size={12} />;
        }
    };

    const getStaffRole = (ann) => {
        return ann.target === "course" ? "Course Instructor" : "Department Admin";
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

    if (loading) return (
        <div className="management-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: '14px' }}>
            <Loader2 size={42} style={{ animation: 'spin 1s linear infinite', color: '#2563eb' }} />
            <h3>Loading Your Dashboard...</h3>
        </div>
    );

    return (
        <div className="management-container">
            <header className="sd-main-header">
                <div className="prereg-header">
                    <h2>Welcome back, {profileData?.staffName}!</h2>
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
            <div className="analyze" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 className="section-divider-title">Course Analytics</h3>


                <div className="sd-filter-dropdown-container" >

                    <div className="sd-select-wrapper" style={{ width: '250px' }}>
                        <select
                            className="sd-custom-select"
                            value={selectedCourseId}
                            onChange={(e) => {
                                setSelectedCourseId(e.target.value);
                                setStatsCourseFilter(e.target.value);
                            }}
                        >
                            {courses.map(c => <option key={c._id} value={c._id}>{c.courseId?.courseName}</option>)}
                        </select>
                        <Filter className="sd-filter-icon" size={16} />
                    </div>
                </div>
            </div>

            <div className="charts-main-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div className="chart-container-card">
                    <h4>Student Levels ({courses.find(c => c._id === selectedCourseId)?.courseId?.courseName})</h4>
                    <div className="chart-wrapper" style={{ position: 'relative' }}>
                        {processedStats.levelDist.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={processedStats.levelDist} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" nameKey="name">
                                        {processedStats.levelDist.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="sd-empty-state" style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <p style={{ fontSize: '12px', color: '#64748b' }}>No students enrolled in this course yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="chart-container-card">
                    <h4>Regulations ({courses.find(c => c._id === selectedCourseId)?.courseId?.courseName})</h4>
                    <div className="chart-wrapper">
                        {processedStats.regDist.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={processedStats.regDist} outerRadius={80} dataKey="value" nameKey="name" label>
                                        {processedStats.regDist.map((entry, index) => <Cell key={`reg-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="sd-empty-state" style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <p style={{ fontSize: '12px', color: '#64748b' }}>No regulation data available.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="chart-container-card">
                    <h4>Course Credits Overview</h4>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={courses.map(c => ({
                                // نرسل الاسم الكامل للبيانات حتى يظهر في الـ Tooltip
                                fullName: c.courseId?.courseName || "N/A",
                                name: c.courseId?.courseCode || c.courseId?.courseName.substring(0, 5) || "N/A",
                                credits: c.courseId?.courseCredits || 0
                            }))}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis />
                                <Tooltip formatter={(value, name, props) => [value, props.payload.fullName]} />
                                <Bar dataKey="credits" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="insights-grid-v2">
                {renderInsightCard({ icon: BookOpen, label: "Active Courses", value: processedStats.activeCount, footer: "Courses assigned to you", colorClass: "blue-grad" })}
                {renderInsightCard({
                    icon: Users,
                    label: "Enrollment",
                    value: statsCourseFilter === "all" ? processedStats.totalEnrollment : (courses.find(c => c._id === statsCourseFilter)?.enrolledCount || 0),
                    footer: "Student participation",
                    colorClass: "green-grad",
                    select: (
                        <select className="insight-select" value={statsCourseFilter} onChange={(e) => {
                            setStatsCourseFilter(e.target.value);
                            setSelectedCourseId(e.target.value);
                        }}>
                            <option value="all">All Courses</option>
                            {courses.map(c => <option key={c._id} value={c._id}>{c.courseId?.courseName}</option>)}
                        </select>
                    )
                })}
                {renderInsightCard({ icon: GraduationCap, label: "Total Credits", value: processedStats.totalCredits, footer: "Teaching load (Hours)", colorClass: "purple-grad" })}
            </div>

            <div className="sd-content-layout">
                <main className="sd-announcements-area">
                    <div className="sd-glass-card sd-announcements-card">
                        <div className="sd-section-header-flex">
                            <h3 className="sd-section-heading">Recent Announcements</h3>
                            <div className="sd-filter-dropdown-container">
                                <div className="sd-select-wrapper">
                                    <select className="sd-custom-select" value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
                                        {courses.map(c => <option key={c._id} value={c._id}>{c.courseId?.courseName}</option>)}
                                    </select>
                                    <Filter className="sd-filter-icon" size={16} />
                                </div>
                            </div>
                        </div>

                        <div className="sd-cards-stack-coo">
                            {filteredAnnouncements.length === 0 ? (
                                <div className="sd-empty-state" style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.4)', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                    <Megaphone size={32} style={{ color: '#94a3b8', marginBottom: '10px' }} />
                                    <p style={{ color: '#64748b', fontWeight: '500' }}>No announcements for this course yet.</p>
                                </div>
                            ) : (
                                filteredAnnouncements.map((ann) => (
                                    <div key={ann._id} className={`sd-ann-item ${ann.isPinned ? 'sd-pinned' : ''}`}>
                                        <div className="sd-ann-header-flex">
                                            <div className="sd-header-badges">
                                                <span className={`sd-pill-tag ${getTagClass(ann.target)}`}>{getTargetLabel(ann.target)}</span>
                                                <span style={getTypeBadgeStyle(ann.type)}>{getTypeIcon(ann.type)} {ann.type}</span>
                                            </div>
                                            <span className="sd-semester-text">{ann.semesterId?.name || ann.semesterId}</span>
                                        </div>
                                        <h3 className="sd-ann-title">{ann.title}</h3>
                                        <p className="sd-ann-content">{ann.content}</p>
                                        <div className="sd-ann-footer-flex">
                                            <div className="sd-footer-dates">
                                                <div className="sd-meta-item"><CalendarPlus size={14} /> <span>{formatDate(ann.createdAt)}</span></div>
                                            </div>
                                            <div className="sd-footer-author">
                                                <div className="sd-author-info">
                                                    <p className="sd-author-name">{ann.staffId?.staffName || "Staff"}</p>
                                                    <p className="sd-author-role">{getStaffRole(ann)}</p>
                                                </div>
                                                <User size={18} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
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
                        <button className="sd-full-btn sd-view-schedule-btn" onClick={() => navigate("/staff/ta/lec-Schedule")}>
                            View Schedule
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default TaDashboard;