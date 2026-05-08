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
    CheckCircle2
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
            console.log("control", res)
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
        } catch (err) {
            console.error("Error fetching students for graph:", err);
            setStudentsData([]);
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
            const res = await api.get("/semesters");
            if (res.data && Array.isArray(res.data)) {
                const sortedSemesters = [...res.data].sort((a, b) => {
                    if (a.isCurrent) return -1;
                    if (b.isCurrent) return 1;
                    return new Date(b.startDate) - new Date(a.startDate);
                });
                setSemesters(sortedSemesters);
                const current = res.data.find(s => s.isCurrent);
                if (current) {
                    const detailRes = await api.get(`/semesters/${current._id}`);
                    setCurrentSemester(detailRes.data);
                }
            }
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
                        <span className="badge dept" style={{ marginLeft: '5px' }}> {currentSemester?.name || "Academic Year"}</span>
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
                            {courses.map(c => <option key={c._id} value={c._id}>{c.courseId?.courseName || "Unknown Course"}</option>)}
                        </select>
                        <Filter className="sd-filter-icon" size={16} />
                    </div>
                </div>
            </div>

            <div className="charts-main-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
                <div className="chart-container-card">
                    <h4>Student Levels ({courses.find(c => c._id === selectedCourseId)?.courseId?.courseName || "Select Course"})</h4>
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
                    <h4>Regulations ({courses.find(c => c._id === selectedCourseId)?.courseId?.courseName || "Select Course"})</h4>
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
                        {courses.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={courses.map(c => ({
                                    fullName: c.courseId?.courseName || "N/A",
                                    name: c.courseId?.courseCode || c.courseId?.courseName?.substring(0, 5) || "N/A",
                                    credits: c.courseId?.courseCredits || 0
                                }))}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis />
                                    <Tooltip formatter={(value, name, props) => [value, props.payload.fullName]} />
                                    <Bar dataKey="credits" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="sd-empty-state" style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <p style={{ fontSize: '12px', color: '#64748b' }}>No courses available.</p>
                            </div>
                        )}
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
                        ? processedStats.graduatesEnrolledCount
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