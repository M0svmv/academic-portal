import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    BookOpen,
    Users,
    Settings,
    X,
    Search,
    GraduationCap,
    ChevronDown,
    ChevronUp,
    Info,
    Layout,
    User
} from 'lucide-react';
import api from "../../services/api";
import '../styles/ProgramCourses.css';
import '../lecturer/LecturerStyle.css';

const CoursesWStudents = () => {
    const { role } = useParams();
    const [courses, setCourses] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [showSchemaModal, setShowSchemaModal] = useState(false);
    const navigate = useNavigate();

    const [expandedCourseId, setExpandedCourseId] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const [statsCourseFilter, setStatsCourseFilter] = useState("all");

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await api.get("/control/courses");
            console.log(res.data)
            setCourses(res.data);
        } catch (err) {
            console.error("Error fetching courses", err);
        }
    };

    const toggleCourseDetails = (courseId) => {
        if (expandedCourseId === courseId) {
            setExpandedCourseId(null);
        } else {
            setExpandedCourseId(courseId);
        }
    };

    const handleOpenSchema = (course) => {
        setSelectedCourse(course);
        setShowSchemaModal(true);
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

    const stats = {
        active: courses.length,
        enrollment: getEnrollmentValue(),
        totalGraduates: courses.reduce((acc, curr) => acc + (curr.graduatesEnrolledCount || 0), 0)
    };

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="prereg-header">
                    <h2>Control: Courses & Students</h2>
                </div>
            </header>

            <div className="insights-grid">
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-blue"><BookOpen size={18} /></span>
                        <span className="insight-label">Active Courses</span>
                    </div>
                    <div className="insight-value">{stats.active}</div>
                    <div className="insight-footer">Total courses in control</div>
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
                        {statsCourseFilter === "all" ? "Total students enrolled" : "Students in selected course"}
                    </div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-purple"><GraduationCap size={18} /></span>
                        <span className="insight-label">Graduates</span>
                    </div>
                    <div className="insight-value">
                        {stats.totalGraduates} <small style={{ fontSize: '14px', color: '#64748b' }}>Students</small>
                    </div>
                    <div className="insight-footer">
                        Total expected graduates enrolled
                    </div>
                </div>
            </div>

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

            <div className="table-wrapper">
                <table className="management-table">
                    <thead>
                        <tr>
                            <th>Course ID</th>
                            <th>Course Name</th>
                            <th>Semester</th>
                            <th style={{ textAlign: 'center' }}>Enrollment</th>
                            {/* <th>Status</th> */}
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
                                    <td style={{ textTransform: 'capitalize' }}>
                                        {course.semesterId ? course.semesterId.replace('-', ' ') : 'N/A'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="type-badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                                            {course.enrolledCount || 0} Students
                                        </span>
                                    </td>
                                    {/* <td>
                                        <span className={`type-badge ${course.status === 'proposed' ? 'icon-orange' : 'icon-green'}`}
                                            style={{ textTransform: 'capitalize' }}>
                                            {course.status}
                                        </span>
                                    </td> */}
                                    <td>
                                        <div className="action-btns">
                                            <button className="btn-icon btn-edit" title="View Schema" onClick={() => handleOpenSchema(course)}>
                                                <Settings size={18} color='#6486ee' />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                title="View Students"
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
                                            <div className="course-details-container">
                                                <div className="details-grid">
                                                    {/* Section 1: Instructor Info */}
                                                    <div className="details-col">
                                                        <h4 className="details-title"><User size={16} /> Instructor Info</h4>
                                                        <div className="details-info-list">
                                                            <div className="info-item"><span>Name:</span> <strong>{course.instructorId?.staffName || 'Not Assigned'}</strong></div>
                                                            <div className="info-item"><span>ID:</span> <strong>{course.instructorId?._id || 'N/A'}</strong></div>
                                                            <div className="info-item"><span>TA:</span> <strong>{course.taId || 'None'}</strong></div>
                                                        </div>
                                                    </div>

                                                    {/* Section 2: Grading Schema */}
                                                    <div className="details-col">
                                                        <h4 className="details-title"><Layout size={16} /> Grading Schema</h4>
                                                        <div className="schema-visualizer">
                                                            {course.gradingSchema && Object.entries(course.gradingSchema).map(([key, val]) => (
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
                                                        <h4 className="details-title"><Info size={16} /> Course Setup</h4>
                                                        <div className="details-info-list">
                                                            <div className="info-item"><span>Lec / Lab:</span> <strong>{course.lecNum} / {course.labNum}</strong></div>
                                                            <div className="info-item"><span>Enrolled:</span> <strong>{course.enrolledCount}</strong></div>
                                                            <div className="info-item"><span>Graduates:</span> <strong>{course.graduatesEnrolledCount}</strong></div>
                                                            <div className="info-item"><span>Periods:</span> <strong>{course.schedule?.lecPeriod || 'N/A'}</strong></div>
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

            {/* View-Only Schema Modal */}
            {showSchemaModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div className="modal-head">
                            <h3>Grading Schema: {selectedCourse?.courseId?._id}</h3>
                            <button className="close-x-btn" onClick={() => setShowSchemaModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '15px' }}>
                                Distribution of marks for this course offering.
                            </p>

                            <div className="schema-visualizer" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {selectedCourse?.gradingSchema && Object.entries(selectedCourse.gradingSchema).map(([key, val]) => (
                                    key !== '_id' && key !== '__v' && (
                                        <div key={key} className="form-group" style={{ width: '45%', marginBottom: '10px' }}>
                                            <label className="capitalize" style={{ fontSize: '12px', color: '#64748b' }}>{key.replace(/([A-Z])/g, ' $1')}</label>
                                            <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', fontWeight: 'bold' }}>
                                                {val} Marks
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-1" onClick={() => setShowSchemaModal(false)} style={{ marginTop: 0, width: '100%' }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoursesWStudents;