import { useParams, useNavigate } from "react-router-dom";
import React, { useEffect, useState, useMemo } from "react";
import {
    Clock,
    Filter,
    AlertCircle,
    Info,
    BookOpen,
    GraduationCap,
    Users,
    Loader2,
    CheckCircle2,
    ShieldCheck,
    ShieldAlert
} from "lucide-react";

import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import api from "../../services/api";
import "../coordinator pages/styles/cooDashbord.css";

const ControlDashboard = () => {
    const { role } = useParams();
    const navigate = useNavigate();
    const [semesters, setSemesters] = useState([]);
    const [currentSemester, setCurrentSemester] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileData, setprofileData] = useState({});
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [studentsData, setStudentsData] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
    const [activeTab, setActiveTab] = useState("all");
    const [statsCourseFilter, setStatsCourseFilter] = useState("all");
    // الحالة الجديدة للأبروفال
    const [finalExamGradesStatus, setFinalExamGradesStatus] = useState("");

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

    // --- Logic for Insights & Charts ---
    const processedStats = useMemo(() => {
        const levels = {};
        const regs = {};

        if (courses && Array.isArray(courses) && courses.length > 0) {
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
            fetchCourseStudents(selectedCourseId);
        }
    }, [selectedCourseId]);

    const fetchCourses = async () => {
        try {
            const res = await api.get("/control/courses");

            const coursesData = Array.isArray(res.data) ? res.data : [];
            setCourses(coursesData);
            if (coursesData.length > 0) {
                setSelectedCourseId(coursesData[0]._id);
                setStatsCourseFilter(coursesData[0]._id);
            }
        } catch (err) {
            console.error("Error fetching courses:", err);
            setCourses([]);
        }
    };

    const fetchCourseStudents = async (courseId) => {
        try {
            const detailsRes = await api.get(`/control/courses/${courseId}/students`);
            setStudentsData(Array.isArray(detailsRes.data.semesterWorks) ? detailsRes.data.semesterWorks : []);

            // تحديث حالة الأبروفال بناءً على بيانات الكورس المختار
            if (detailsRes.data.course) {
                setFinalExamGradesStatus(detailsRes.data.course.finalExamGradesStatus || "pending");
            }
        } catch (err) {
            console.error("Error fetching students for graph:", err);
            setStudentsData([]);
            setFinalExamGradesStatus("");
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

    const renderInsightCard = ({ icon: Icon, label, value, footer, colorClass, select, onClick, className = "" }) => (
        <div key={label} className={`insight-card-v2 ${colorClass} ${onClick ? 'clickable' : ''} ${className}`} onClick={onClick}>
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
            <Loader2 size={42} className="animate-spin" style={{ color: '#2563eb' }} />
            <h3>Loading Your Dashboard...</h3>
        </div>
    );

    return (
        <div className="management-container">
            <header className="sd-main-header">
                <div className="prereg-header">
                    <h2>Welcome back, {profileData?.staffName || 'User'}!</h2>
                    <p className="sd-subtitle">
                        <span className="badge dept" style={{ marginLeft: '5px' }}> {currentSemester?.name || "No semester opened"}</span>
                    </p>
                </div>
            </header>

            {/* --- SEMESTER TIMELINE --- */}
            {currentSemester && currentSemester.timeLine && (
                <div className="st-container">
                    <div className="st-glass-card-main">
                        <div className="st-header">
                            <div className="st-title-wrapper">
                                <h3 className="sd-section-heading">Semester Timeline: {currentSemester.name || "Current"}</h3>
                            </div>
                        </div>
                        <div className="st-milestones-grid">
                            {Object.entries(currentSemester.timeLine).map(([key, dates]) => {
                                if (!dates.start || !dates.end) return null;
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

            <div className="analyze" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h3 className="section-divider-title" style={{ margin: 0 }}>Course Analytics</h3>

                    {/* الإنديكيشن الجديد للاحتمالية Approval */}
                    {selectedCourseId && (
                        <div className={`status-indicator-badge ${finalExamGradesStatus === 'approved' ? 'status-approved' : 'status-pending'}`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: '500',
                                backgroundColor: finalExamGradesStatus === 'approved' ? '#ecfdf5' : '#fffbeb',
                                color: finalExamGradesStatus === 'approved' ? '#059669' : '#d97706',
                                border: `1px solid ${finalExamGradesStatus === 'approved' ? '#10b981' : '#f59e0b'}`
                            }}>
                            {finalExamGradesStatus === 'approved' ? (
                                <> <ShieldCheck size={16} /> Grades Approved </>
                            ) : (
                                <> <ShieldAlert size={16} /> Grades Pending </>
                            )}
                        </div>
                    )}
                </div>

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
                            {courses.map(c => <option key={c._id} value={c._id}>{c.courseId?.courseName || "Unknown Course"}</option>)}
                        </select>
                        <Filter className="sd-filter-icon" size={16} />
                    </div>
                </div>
            </div>

            <div className="insights-grid-v2" style={{ marginTop: '20px' }}>
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
                {renderInsightCard({
                    icon: GraduationCap,
                    label: "Graduates Count",
                    value: statsCourseFilter === "all"
                        ? (processedStats.graduatesEnrolledCount || 0)
                        : (courses.find(c => c._id === statsCourseFilter)?.graduatesCount || 0),
                    footer: "Grads participation",
                    colorClass: "purple-grad",
                    select: (
                        <select className="insight-select" value={statsCourseFilter} onChange={(e) => {
                            setStatsCourseFilter(e.target.value);
                            setSelectedCourseId(e.target.value);
                        }}>
                            <option value="all">All Courses</option>
                            {courses.map(c => (
                                <option key={c._id} value={c._id}>
                                    {c.courseId?.courseName}
                                </option>
                            ))}
                        </select>
                    )
                })}
            </div>
        </div>
    );
};

export default ControlDashboard;