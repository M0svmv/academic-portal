import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
    BookOpen,
    Users,
    Settings,
    X,
    Search,
    Clock,
    GraduationCap,
    ChevronDown,
    ChevronUp,
    Info,
    Layout
    , Loader2,
    AlertCircle,

    Filter,
    Inbox
} from 'lucide-react';
import api from "../../services/api";
import '../styles/ProgramCourses.css';
import './LecturerStyle.css';
const COURSE_REGULATION = ["New", "Last"];
const MyCoursesTA = () => {
    const { role } = useParams();
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [showSchemaModal, setShowSchemaModal] = useState(false);
    const navigate = useNavigate();
    const [filterRegulation, setFilterRegulation] = useState("");
    const [expandedCourseId, setExpandedCourseId] = useState(null);
    const [courseDetails, setCourseDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const [statsCourseFilter, setStatsCourseFilter] = useState("all");

    const [schema, setSchema] = useState({
        midTerm: 0,
        attendance: 0,
        lab: 0,
        practical: 0,
        bonus: 0,
        final: 0
    });

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const res = await api.get("/tas/me/courses");
            setCourses(res.data);
        } catch (err) {
            console.error("Error fetching TA courses", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleCourseDetails = async (courseId) => {
        if (expandedCourseId === courseId) {
            setExpandedCourseId(null);
            setCourseDetails(null);
            return;
        }

        setExpandedCourseId(courseId);
        setLoadingDetails(true);
        try {
            const res = await api.get(`/tas/me/courses/${courseId}`);
            setCourseDetails(res.data.course);
        } catch (err) {
            console.error("Error fetching course details", err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleOpenSchema = (course) => {
        setSelectedCourse(course);
        setSchema({
            midTerm: course.gradingSchema?.midTerm || 0,
            attendance: course.gradingSchema?.attendance || 0,
            lab: course.gradingSchema?.lab || 0,
            practical: course.gradingSchema?.practical || 0,
            bonus: course.gradingSchema?.bonus || 0,
            final: course.gradingSchema?.final || 0
        });
        setShowSchemaModal(true);
    };

    const updateSchema = async () => {
        const total = schema.midTerm + schema.attendance + schema.lab + schema.practical + schema.final;

        if (total !== 100 && total !== 50) {
            if (!window.confirm(`Total marks are ${total}. Are you sure you want to save?`)) return;
        }

        try {
            await api.put(`/tas/me/courses/${selectedCourse._id}/schema`, schema);
            alert("Schema updated successfully!");
            setShowSchemaModal(false);
            fetchCourses();
        } catch (err) {
            alert("Error updating schema");
        }
    };

    const filteredCourses = courses.filter(c => {
        const matchesSearch = c.courseId?._id?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRegulation = filterRegulation === "" || c.courseId?.courseRegulation === filterRegulation;
        return matchesSearch && matchesRegulation;
    });

    const getStats = () => {
        let enrollmentCount = 0;
        if (statsCourseFilter === "all") {
            enrollmentCount = courses.reduce((a, b) => a + (b.enrolledCount || 0), 0);
        } else {
            const selected = courses.find(c => c._id === statsCourseFilter);
            enrollmentCount = selected ? (selected.enrolledCount || 0) : 0;
        }

        const totalCredits = courses.reduce((a, b) => a + (b.courseId?.courseCredits || 0), 0);
        const pendingCount = courses.filter(c => c.status === 'proposed').length;

        return {
            active: courses.length,
            enrollment: enrollmentCount,
            pending: pendingCount,
            totalCredits: totalCredits
        };
    };

    const stats = getStats();

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="prereg-header">
                    <h2>TA Courses Management</h2>
                </div>
            </header>

            <div className="insights-grid">
                {/* كارد 1: Assigned Courses */}
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-blue"><BookOpen size={18} /></span>
                        <span className="insight-label">Assigned Courses</span>
                    </div>
                    <div className="insight-value">{stats.active}</div>
                    <div className="insight-footer">Courses you assist in</div>
                </div>

                {/* كارد 2: Enrollment (المعدل حسب طلبك) */}
                <div className="insight-card">
                    <div className="insight-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="insight-icon icon-green"><Users size={18} /></span>
                        </div>
                        <select
                            className="insight-select"
                            value={statsCourseFilter}
                            onChange={(e) => setStatsCourseFilter(e.target.value)}
                            style={{ padding: '2px 4px', fontSize: '12px', borderRadius: '4px', border: '1px solid #e2e8f0', outline: 'none' }}
                        >
                            <option value="all">All Courses</option>
                            {courses.map(c => (
                                <option key={c._id} value={c._id}>{c.courseId?._id}</option>
                            ))}
                        </select>
                    </div>
                    <div className="insight-value">{stats.enrollment}</div>
                    <div className="insight-footer">
                        {statsCourseFilter === "all" ? "Total students across all courses" : "Students in selected course"}
                    </div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-purple"><GraduationCap size={18} /></span>
                        <span className="insight-label">Academic Load</span>
                    </div>
                    <div className="insight-value">
                        {stats.totalCredits} <small style={{ fontSize: '14px', color: '#64748b' }}>Hrs</small>
                    </div>
                    <div className="insight-footer">
                        Total credit hours this semester
                    </div>
                </div>
            </div>

            <div className="table-controls" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                    <Search size={22} color="#9ca3af" style={{ position: 'absolute', left: '12px' }} />
                    <input
                        className="search-input"
                        type="text"
                        placeholder="Search by Course ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '45px', width: '100%' }}
                    />
                </div>

                <div className="regulation-filter-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '0 12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', height: '48px' }}>
                    <Filter size={18} color="#64748b" />
                    <select
                        value={filterRegulation}
                        onChange={e => setFilterRegulation(e.target.value)}
                        style={{ border: 'none', outline: 'none', color: '#1e293b', fontWeight: '500', cursor: 'pointer', background: 'transparent' }}
                    >
                        <option value="">All Regulations</option>
                        {COURSE_REGULATION.map(r => (
                            <option key={r} value={r}>{r} Regulation</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="management-table">
                    <thead>
                        <tr>
                            <th>Course ID</th>
                            <th>Course Name</th>
                            <th>Course Regulation</th>
                            <th>Semester</th>
                            <th style={{ textAlign: 'center' }}>Enrollment</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6">
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '12px' }}>
                                        <Loader2 size={32} className="animate-spin" color="#2563eb" />
                                        <span style={{ color: '#64748b', fontWeight: '500' }}>Loading courses data...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : courses.length === 0 ? (
                            <tr>
                                <td colSpan="6">
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', gap: '15px' }}>
                                        <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '50%' }}>
                                            <Inbox size={40} color="#94a3b8" />
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <h3 style={{ color: '#1e293b', marginBottom: '4px' }}>No Courses Assigned</h3>
                                            <p style={{ color: '#64748b' }}>You don't have any courses assigned to you for this semester yet.</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredCourses.length === 0 ? (
                            <tr>
                                <td colSpan="6">
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px', gap: '15px' }}>
                                        <AlertCircle size={40} color="#f59e0b" />
                                        <div style={{ textAlign: 'center' }}>
                                            <h3 style={{ color: '#1e293b', marginBottom: '4px' }}>No Results Found</h3>

                                            <button
                                                onClick={() => { setSearchTerm(""); setFilterRegulation(""); }}
                                                style={{ marginTop: '10px', color: '#2563eb', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                Clear all filters
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredCourses.map(course => (
                                <React.Fragment key={course._id}>
                                    <tr className={expandedCourseId === course._id ? 'selected-row' : ''}>
                                        <td className="course-id-cell">
                                            <div
                                                onClick={() => toggleCourseDetails(course._id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    cursor: 'pointer',
                                                    color: '#2563eb',
                                                    fontWeight: '700'
                                                }}
                                            >
                                                {expandedCourseId === course._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                {course.courseId?._id}
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: '500' }}> {course.courseId?.courseName}</td>
                                        <td style={{ fontWeight: '500' }}> {course.courseId?.courseRegulation}</td>
                                        <td style={{ textTransform: 'capitalize' }}>
                                            {course.semesterId ? course.semesterId.replace('-', ' ') : 'N/A'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="type-badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                                                {course.enrolledCount || 0} Students
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-btns">
                                                <button className="btn-icon btn-edit" title="Settings" onClick={() => handleOpenSchema(course)}>
                                                    <Settings size={18} color='#6486ee' />
                                                </button>
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => navigate(`/staff/${role}/grading/${course._id}/${course.courseId?._id}`)}
                                                >
                                                    <Users size={18} color='#62b986' />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Details Row */}
                                    {expandedCourseId === course._id && (
                                        <tr className="details-expanded-row">
                                            <td colSpan="6">
                                                {loadingDetails ? (
                                                    <div className="details-loader">Fetching course data...</div>
                                                ) : (
                                                    <div className="course-details-container">
                                                        <div className="details-grid">
                                                            {/* Section 1: Basic Stats */}
                                                            <div className="details-col">
                                                                <h4 className="details-title"><Info size={16} /> Course Info</h4>
                                                                <div className="details-info-list">
                                                                    <div className="info-item"><span>Credits:</span> <strong>{courseDetails?.courseId?.courseCredits}</strong></div>
                                                                    <div className="info-item"><span>Level:</span> <strong className="capitalize">{courseDetails?.courseId?.courseLevel}</strong></div>
                                                                    <div className="info-item"><span>Type:</span> <strong className="capitalize">{courseDetails?.courseId?.courseType}</strong></div>
                                                                    <div className="info-item"><span>Regulation:</span> <strong>{courseDetails?.courseId?.courseRegulation}</strong></div>
                                                                </div>
                                                            </div>

                                                            {/* Section 2: Grading Schema */}
                                                            <div className="details-col">
                                                                <h4 className="details-title"><Layout size={16} /> Grading Schema</h4>
                                                                <div className="schema-visualizer">
                                                                    {courseDetails?.gradingSchema && Object.entries(courseDetails.gradingSchema).map(([key, val]) => (
                                                                        key !== '_id' && key !== '__v' && (
                                                                            <div key={key} className="schema-pill">
                                                                                <span className="pill-key">{key.replace(/([A-Z])/g, ' $1')}</span>
                                                                                <span className="pill-val">{val}</span>
                                                                            </div>
                                                                        )
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Section 3: Academic Setup */}
                                                            <div className="details-col">
                                                                <h4 className="details-title"><GraduationCap size={16} /> Academic Setup</h4>
                                                                <div className="details-info-list">
                                                                    <div className="info-item"><span>Instructor ID:</span> <strong>{courseDetails?.instructorId}</strong></div>
                                                                    <div className="info-item"><span>Lec / Lab:</span> <strong>{courseDetails?.lecNum} / {courseDetails?.labNum}</strong></div>
                                                                    <div className="info-item"><span>Enrolled:</span> <strong>{courseDetails?.enrolledCount}</strong></div>
                                                                    <div className="info-item"><span>Graduates:</span> <strong>{courseDetails?.graduatesEnrolledCount}</strong></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MyCoursesTA;