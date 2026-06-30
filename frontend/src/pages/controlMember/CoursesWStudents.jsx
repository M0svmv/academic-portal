import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    BookOpen,
    Users,
    Search,
    GraduationCap,
    ChevronDown,
    ChevronUp,
    Info,
    Layout,
    User
    , Loader2
} from 'lucide-react';
import api from "../../services/api";
import '../styles/ProgramCourses.css';
import '../lecturer/LecturerStyle.css';

const CoursesWStudents = () => {
    const { role } = useParams();
    const [courses, setCourses] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCourseId, setExpandedCourseId] = useState(null);
    const [statsCourseFilter, setStatsCourseFilter] = useState("all");
    // State جديد لفلتر كارد الخريجين
    const [statsGradsFilter, setStatsGradsFilter] = useState("all");
    const navigate = useNavigate();

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await api.get("/control/courses");
            setCourses(res.data);

        } catch (err) {
            console.error("Error fetching courses", err);
        }
    };

    const toggleCourseDetails = (courseId) => {
        setExpandedCourseId(expandedCourseId === courseId ? null : courseId);
    };

    const filteredCourses = courses.filter(c =>
        c.courseId?._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.courseId?.courseName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getEnrollmentValue = () => {
        if (statsCourseFilter === "all") {
            return courses.reduce((a, b) => a + (b.enrolledCount || 0), 0);
        }
        const target = courses.find(c => c._id === statsCourseFilter);
        return target ? (target.enrolledCount || 0) : 0;
    };

    // دالة حساب قيمة الخريجين بناءً على الفلتر المختار
    const getGraduatesValue = () => {
        if (statsGradsFilter === "all") {
            return courses.reduce((acc, curr) => acc + (curr.graduatesEnrolledCount || 0), 0);
        }
        const target = courses.find(c => c._id === statsGradsFilter);
        return target ? (target.graduatesEnrolledCount || 0) : 0;
    };

    const stats = {
        active: courses.length,
        enrollment: getEnrollmentValue(),
        totalGraduates: getGraduatesValue()
    };

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="prereg-header">
                    <h2>Control: Courses & Students</h2>
                </div>
            </header>

            {/* Insights Cards */}
            <div className="insights-grid">
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-blue"><BookOpen size={18} /></span>
                        <span className="insight-label">Active Courses</span>
                    </div>
                    <div className="insight-value">{stats.active}</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="insight-icon icon-green"><Users size={18} /></span>
                            <span className="insight-label">Enrollment</span>
                        </div>
                        <select
                            className="insight-select"
                            value={statsCourseFilter}
                            onChange={(e) => setStatsCourseFilter(e.target.value)}
                        >
                            <option value="all">All Courses</option>
                            {courses.map(c => (
                                <option key={c._id} value={c._id}>{c.courseId?._id}</option>
                            ))}
                        </select>
                    </div>
                    <div className="insight-value">{stats.enrollment}</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="insight-icon icon-purple"><GraduationCap size={18} /></span>
                            <span className="insight-label">Graduates</span>
                        </div>
                        <select
                            className="insight-select"
                            value={statsGradsFilter}
                            onChange={(e) => setStatsGradsFilter(e.target.value)}
                        >
                            <option value="all">All Courses</option>
                            {courses.map(c => (
                                <option key={c._id} value={c._id}>{c.courseId?._id}</option>
                            ))}
                        </select>
                    </div>
                    <div className="insight-value">{stats.totalGraduates}</div>
                </div>
            </div>

            {/* Search */}
            <div className="filters-wrapper">
                <Search size={22} color="#9ca3af" />
                <input
                    className="search-input"
                    type="text"
                    placeholder="Search by Course ID or Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table className="management-table">
                    <thead>
                        <tr>
                            <th>Course ID</th>
                            <th>Course Name</th>
                            <th>Semester</th>
                            <th style={{ textAlign: 'center' }}>Enrollment</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCourses.map(course => (
                            <React.Fragment key={course._id}>
                                <tr className={expandedCourseId === course._id ? 'selected-row' : ''}>
                                    <td className="course-id-cell">
                                        <div
                                            onClick={() => toggleCourseDetails(course._id)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#2563eb', fontWeight: '700' }}
                                        >
                                            {expandedCourseId === course._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            {course.courseId?._id}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: '500' }}>{course.courseId?.courseName}</td>
                                    <td style={{ textTransform: 'capitalize' }}>
                                        {course.semesterId ? course.semesterId.replace('-', ' ') : 'N/A'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="type-badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                                            {course.enrolledCount || 0} Students
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div className="action-btns">
                                            <button
                                                className="btn-icon"
                                                title="View Students List"
                                                onClick={() => navigate(`/staff/${role}/final-grading/${course._id}/${course.courseId?._id}`)}
                                            >
                                                <Users size={18} color='#62b986' />
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {/* Expanded Details Row */}
                                {expandedCourseId === course._id && (
                                    <tr className="details-expanded-row">
                                        <td colSpan="5">
                                            <div className="course-details-container">
                                                <div className="details-grid">
                                                    {/* Instructor Info */}
                                                    <div className="details-col">
                                                        <h4 className="details-title"><User size={16} /> Instructor Info</h4>
                                                        <div className="details-info-list">
                                                            <div className="info-item">
                                                                <span>Lecturer Name:</span>
                                                                <strong>{course.instructorId?.staffName || 'Not Assigned'}</strong>
                                                            </div>
                                                            <div className="info-item">
                                                                <span>Lecturer ID:</span>
                                                                <strong>{course.instructorId?._id || 'N/A'}</strong>
                                                            </div>
                                                            <div className="info-item">
                                                                <span>TA Name:</span>
                                                                <strong>{course.taId?.staffName || 'Not Assigned'}</strong>
                                                            </div>
                                                            <div className="info-item">
                                                                <span>TA Staff ID:</span>
                                                                <strong>{course.taId?._id || 'N/A'}</strong>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Grading Schema Visualizer */}
                                                    <div className="details-col">
                                                        <h4 className="details-title"><Layout size={16} /> Grading Schema</h4>
                                                        <div className="schema-visualizer">
                                                            {course.gradingSchema && Object.entries(course.gradingSchema).map(([key, val]) => (
                                                                !['_id', '__v'].includes(key) && (
                                                                    <div key={key} className="schema-pill">
                                                                        <span className="pill-key">{key.replace(/([A-Z])/g, ' $1')}</span>
                                                                        <span className="pill-val">{val}</span>
                                                                    </div>
                                                                )
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Additional Info */}
                                                    <div className="details-col">
                                                        <h4 className="details-title"><Info size={16} /> Academic Info</h4>
                                                        <div className="details-info-list">
                                                            <div className="info-item"><span>Lec/Lab Hours:</span> <strong>{course.lecNum} / {course.labNum}</strong></div>
                                                            <div className="info-item"><span>Graduates:</span> <strong>{course.graduatesEnrolledCount}</strong></div>
                                                            <div className="info-item"><span>Lec Period:</span> <strong>{course.schedule?.lecPeriod || 'N/A'}</strong></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CoursesWStudents;