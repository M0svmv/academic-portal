import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import swalService from "../../services/swal";
import "../styles/StudentDetails.css";
import {
    FaArrowLeft, FaUserTie,
    FaExclamationTriangle, FaInfoCircle, FaEnvelope, FaPhoneAlt, FaSearch, FaCalendarAlt, FaTimes, FaClock
} from "react-icons/fa";
import { GitBranch, CalendarDays, AlertTriangle, Info } from 'lucide-react';

import StudentProgressMapModal from "../../components/StudentProgressMap";


const StudentScheduleModal = ({ isOpen, onClose, studentId }) => {
    const [scheduleData, setScheduleData] = useState(null);
    const [loading, setLoading] = useState(false);
    const daysOfWeek = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

    useEffect(() => {
        if (isOpen && studentId) {
            const fetchSchedule = async () => {
                setLoading(true);
                try {
                    const res = await api.get(`/academic-advisors/me/students/${studentId}/schedule`);
                    setScheduleData(res.data);
                } catch (err) {
                    console.error("Failed to fetch schedule", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchSchedule();
        }
    }, [isOpen, studentId]);

    if (!isOpen) return null;



    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="modal-content" style={{
                backgroundColor: '#fff', color: '#000', width: '95%', maxWidth: '1400px',
                maxHeight: '90vh', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <CalendarDays size={28} color="#4e73df" />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Academic Schedule</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#2c2f36' }}>
                                {scheduleData?.student?.studentName} ({scheduleData?.student?._id})
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '1.2rem' }}>
                        <FaTimes />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px', overflowX: 'auto', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}><div className="loader"></div></div>
                    ) : scheduleData ? (
                        <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'separate', borderSpacing: '8px' }}>
                            <thead>
                                <tr>
                                    <th style={{ backgroundColor: 'var( --primary-blue-color)', color: 'f8fafc', padding: '15px', borderRadius: '8px', minWidth: '100px' }}>Days</th>
                                    {[...Array(6)].map((_, i) => {
                                        const pIdx = i * 2;
                                        const periods = scheduleData.schedule.periodsTime;
                                        const pStart = periods[pIdx];
                                        const pEnd = periods[pIdx + 1] || pStart;
                                        return (
                                            <th key={i} style={{ backgroundColor: 'var( --primary-blue-color)', padding: '10px', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#fff' }}>Session {i + 1}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#f8fafc', marginTop: '4px' }}>
                                                    {pStart?.startTime} - {pEnd?.endTime}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {daysOfWeek.map(day => (
                                    <tr key={day}>
                                        <td style={{ backgroundColor: '#f9fafc', padding: '20px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                            {day}
                                        </td>
                                        {[...Array(6)].map((_, i) => {
                                            const currentLecPeriod = i + 1; // تعديل ليتناسب مع منطق الجدول
                                            const courses = scheduleData.offerings?.filter(o =>
                                                o.schedule?.days?.includes(day) &&
                                                Number(o.schedule.lecPeriod) === currentLecPeriod
                                            ) || [];

                                            return (
                                                <td key={i} style={{ backgroundColor: '#f8fafc', borderRadius: '10px', height: '100px', verticalAlign: 'center', padding: '8px' }}>
                                                    {courses.map((course, idx) => (
                                                        <div key={idx} style={{
                                                            backgroundColor: 'rgba(78, 115, 223, 0.1)', borderLeft: '4px solid #4e73df',
                                                            padding: '8px', borderRadius: '4px', marginBottom: '4px'
                                                        }}>
                                                            <div style={{ fontSize: '0.7rem', color: '#4e73df', fontWeight: 'bold' }}>#{course.courseId?._id}</div>
                                                            <div style={{ fontSize: '0.8rem', margin: '3px 0', fontWeight: '600' }}>{course.courseId?.courseName}</div>
                                                            <div style={{ fontSize: '0.65rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <FaClock size={10} /> {course.schedule?.lecLength} Periods
                                                            </div>
                                                        </div>
                                                    ))}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#666' }}>No schedule found.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const CREDIT_MAP = {
    total: { label: "Total Credits", key: "completedCredits" },
    core: { label: "Core", key: "coreCompletedCredits" },
    elective1: { label: "Elective 1", key: "elective1CompletedCredits" },
    elective2: { label: "Elective 2", key: "elective2CompletedCredits" },
    elective3: { label: "Elective 3", key: "elective3CompletedCredits" },
    program: { label: "Elective Program", key: "electiveProgramCompletedCredits" },
    math: { label: "Eng. Math", key: "engMathCompletedCredits" },
    physics: { label: "Eng. Physics", key: "engPhysicsCompletedCredits" },
    training: { label: "Training", key: "trainingCompletedCredits" }
};

const AdvisedStudentDetails = () => {
    const navigate = useNavigate();
    const { id, role } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filterType, setFilterType] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [creditType, setCreditType] = useState("total");
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [allCourses, setAllCourses] = useState([]);

    const fetchAllCourses = async () => {
        try {
            const res = await api.get("/academic-advisors/me/department-courses");
            setAllCourses(res.data);
        } catch (err) {
            console.error("Failed to fetch courses", err);
        }
    };

    const fetchStudentDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/academic-advisors/me/students/${id}`);
            setData(res.data);
            console.log(res.data)
            setLoading(false);
        } catch (err) {
            setError("Failed to load student data.");
            setLoading(false);
        }
    };

    const getGradeInfo = (grade) => {
        if (grade >= 90) return { letter: "A", class: "safe", status: "Passed" };
        if (grade >= 80) return { letter: "B", class: "safe", status: "Passed" };
        if (grade >= 70) return { letter: "C", class: "safe", status: "Passed" };
        if (grade >= 60) return { letter: "D", class: "safe", status: "Passed" };
        return { letter: "F", class: "risk", status: "Failed" };
    };

    useEffect(() => {
        fetchStudentDetails();
        fetchAllCourses();
    }, [id]);

    if (loading) return <div className="loading-container"><div className="loader"></div></div>;
    if (error) return <div className="error-container"><FaExclamationTriangle size={30} /> {error}</div>;
    if (!data || !data.transcript) return null;

    const { transcript, semesterWorks } = data;

    const getDisplayCredits = () => {
        const apiKey = CREDIT_MAP[creditType]?.key;
        return transcript[apiKey] || 0;
    };

    const filteredCourses = transcript.completedCourses?.filter(c => {
        const courseName = c.courseId?.courseName || c.courseId || "";
        const courseCode = c.courseId?._id || c.courseId || "";

        const matchesType = filterType === "all" || (filterType === "failed" ? c.grade < 60 : c.courseId?.courseType === filterType);
        const matchesSearch = courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            courseCode.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    const failedCount = transcript.completedCourses?.filter(c => c.grade < 60).length || 0;

    return (
        <div className="management-container student-details-wrapper">
            <div className="details-header">
                <div className="header-left">
                    <button className="back-btn-round" onClick={() => navigate(-1)}><FaArrowLeft /></button>
                    <div className="student-main-info">
                        <h2>{transcript.studentId?.studentName}</h2>
                        <div className="id-tags">
                            <span className="id-badge">ID: {transcript.studentId?._id}</span>

                        </div>
                        <div className="status-container">
                            <span className={`badge ${transcript.atRisk ? 'risk' : 'safe'}`}>{transcript.atRisk ? "At Risk" : "Good Standing"}</span>
                            <span className="badge dept">{transcript.department}</span>
                            <span className={`badge level-${transcript.level}`}>{transcript.level}</span>
                            <span className="badge-select">Regulation: {transcript.regulation}</span>
                        </div>
                    </div>
                </div>

                <div className="academic-profile-card">
                    <div className="advisor-info-row" >
                        <div className="advisor-contact-minimal" style={{ margin: '0 auto', padding: '0' }} >
                            <span><FaEnvelope /> {transcript.studentId?.studentEmail || "No Email"}</span>
                            <span><FaPhoneAlt /> {transcript.studentId?.studentPhone || "No Phone"}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                marginBottom: '24px'
            }}>
                {/* GPA Card */}
                <div className={`dash-card primary ${transcript.GPA < 2 ? 'border-danger' : ''}`} style={{
                    background: '#fff',
                    border: transcript.GPA < 2 ? '1px solid #fee2e2' : '1px solid #f1f5f9',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cumulative GPA</label>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: transcript.GPA < 2 ? '#ef4444' : '#10b981'
                        }}></span>
                    </div>
                    <div className="gpa-display" style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '12px 0 16px 0' }}>
                        <span className={`gpa-value ${transcript.GPA < 2 ? 'text-danger' : ''}`} style={{
                            fontSize: '32px',
                            fontWeight: '800',
                            color: transcript.GPA < 2 ? '#ef4444' : '#1e293b',
                            lineHeight: '1'
                        }}>
                            {transcript.GPA?.toFixed(2)}
                        </span>
                        <span className="gpa-max" style={{ fontSize: '14px', fontWeight: '500', color: '#94a3b8' }}>/ 4.0</span>
                    </div>
                    <div className="mini-progress-bar" style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        marginTop: 'auto'
                    }}>
                        <div
                            className="fill"
                            style={{
                                width: `${(transcript.GPA / 4) * 100}%`,
                                height: '100%',
                                borderRadius: '10px',
                                backgroundColor: transcript.GPA < 2 ? '#ef4444' : '#10b981',
                                transition: 'width 0.5s ease-in-out'
                            }}
                        ></div>
                    </div>
                </div>

                {/* Failing Courses Card */}
                <div
                    className={`dash-card alert-card ${failedCount > 0 ? 'border-danger' : ''}`}
                    onClick={() => setFilterType("failed")}
                    style={{
                        background: failedCount > 0 ? '#fffcfc' : '#fff',
                        border: failedCount > 0 ? '1px solid #fee2e2' : '1px solid #f1f5f9',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)';
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Failing Courses</label>
                        <AlertTriangle size={18} className={failedCount > 0 ? "text-warn" : "text-muted"} style={{ color: failedCount > 0 ? '#f59e0b' : '#94a3b8' }} />
                    </div>
                    <div className="value-group" style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '12px 0 16px 0' }}>
                        <span className="big-val" style={{ fontSize: '32px', fontWeight: '800', color: failedCount > 0 ? '#ef4444' : '#1e293b', lineHeight: '1' }}>{failedCount}</span>
                    </div>
                    <p className="sub-info" style={{
                        margin: 0,
                        fontSize: '11px',
                        fontWeight: '600',
                        color: failedCount > 0 ? '#ef4444' : '#64748b',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        {failedCount > 0 ? "● Requires Immediate Action" : "All courses passed"}
                    </p>
                </div>

                {/* Done Credits Card */}
                <div className="dash-card" style={{
                    background: '#fff',
                    border: '1px solid #f1f5f9',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div className="card-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Done Credits</label>
                        <select
                            className="card-select"
                            value={creditType}
                            onChange={(e) => setCreditType(e.target.value)}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '11px',
                                fontWeight: '600',
                                color: '#475569',
                                backgroundColor: '#f8fafc',
                                cursor: 'pointer',
                                outline: 'none',
                                transition: 'border-color 0.15s ease'
                            }}
                        >
                            {Object.entries(CREDIT_MAP).map(([shortKey, info]) => (
                                <option key={shortKey} value={shortKey}>
                                    {info.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="value-group" style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '12px 0 16px 0' }}>
                        <span className="big-val" style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', lineHeight: '1' }}>{getDisplayCredits()}</span>
                        <span className="unit" style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Hrs</span>
                    </div>
                    <p className="sub-info" style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>From total curriculum requirements</p>
                </div>

                {/* Academic Alerts Card */}
                <div className="dash-card academic-alerts-card" style={{
                    background: '#fff',
                    border: '1px solid #f1f5f9',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <label style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Academic Alerts</label>
                        {transcript.alerts > 0 ? (
                            <AlertTriangle className="text-warn" size={18} style={{ color: '#ef4444' }} />
                        ) : (
                            <Info className="text-muted" size={18} style={{ color: '#94a3b8' }} />
                        )}
                    </div>

                    <div className="alerts-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                        <div className="stat-box">
                            <span className="stat-label" style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>Consecutive</span>
                            <span className="big-val" style={{ fontSize: '24px', fontWeight: '700', color: transcript.alerts >= 3 ? '#ef4444' : '#1e293b' }}>
                                {transcript.alerts} <span style={{ fontSize: '14px', fontWeight: '500', color: '#94a3b8' }}>/ 4</span>
                            </span>
                        </div>
                        <div className="stat-box" style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '16px' }}>
                            <span className="stat-label" style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>Total</span>
                            <span className="big-val" style={{ fontSize: '24px', fontWeight: '700', color: transcript.totalAlerts >= 5 ? '#ef4444' : '#1e293b' }}>
                                {transcript.totalAlerts} <span style={{ fontSize: '14px', fontWeight: '500', color: '#94a3b8' }}>/ 6</span>
                            </span>
                        </div>
                    </div>

                    <p className="sub-info" style={{
                        margin: 0,
                        fontSize: '11px',
                        color: '#ef4444',
                        backgroundColor: '#fef2f2',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontWeight: '500',
                        lineHeight: '1.4'
                    }}>
                        Dismissal policy: 6 total alerts or 4 consecutive will lead to expulsion.
                    </p>
                </div>
            </div>

            <div className="details-content-sections">
                <div className="data-section">
                    <div className="section-title-bar">
                        <h3>Current Semester Works</h3>
                        {/* زر فتح الجدول الدراسي */}
                        <button className="btn-1" onClick={() => setIsScheduleModalOpen(true)}>
                            <FaCalendarAlt size={16} /> View Study Schedule
                        </button>
                    </div>
                    <div className="table-responsive table-wrapper">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Course Name</th>
                                    <th title="Midterm">Mid.</th>
                                    <th title="Lab">Lab</th>
                                    <th title="Practical">Prac.</th>
                                    <th title="Attendance">Att.</th>
                                    <th title="Bonus">Bon.</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {semesterWorks?.length > 0 ? (
                                    semesterWorks.map((work) => {

                                        const g = typeof work.grade === 'object' ? work.grade : {};

                                        const semesterTotal =
                                            (g.midTermGrade ?? 0) +
                                            (g.labGrade ?? 0) +
                                            (g.practicalGrade ?? 0) +
                                            (g.attendanceGrade ?? 0) +
                                            (g.bonusGrade ?? 0);

                                        let gradeStatusClass = '';
                                        if (semesterTotal < 30) {
                                            gradeStatusClass = 'low-grade';
                                        } else if (semesterTotal >= 40) {
                                            gradeStatusClass = 'high-grade';
                                        }

                                        return (
                                            <tr key={work._id}>
                                                <td className="course-id-cell">{work.courseId?._id}</td>
                                                <td>{work.courseId?.courseName}</td>

                                                {/* تفاصيل الدرجات منفصلة */}
                                                <td>{g.midTermGrade ?? 0}</td>
                                                <td>{g.labGrade ?? 0}</td>
                                                <td>{g.practicalGrade ?? 0}</td>
                                                <td>{g.attendanceGrade ?? 0}</td>
                                                <td>{g.bonusGrade ?? 0}</td>

                                                <td>
                                                    <span className={`grade-pill ${gradeStatusClass}`}>
                                                        {semesterTotal}/50
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan="8" className="empty-msg">No courses enrolled this semester</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="data-section" style={{ marginTop: '2rem' }}>
                        <div className="section-title-bar">
                            <h3>Academic Transcript</h3>
                            <button className="btn-1" onClick={() => setIsMapModalOpen(true)}>
                                <GitBranch size={18} /> View Progress Map
                            </button>
                        </div>

                        <div className="filter-search-row">
                            <div className="search-box">
                                <FaSearch />
                                <input type="text" placeholder="Search course..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                        </div>

                        <div className="table-wrapper">
                            <table className="modern-table dynamic-table">
                                <thead>
                                    <tr>
                                        <th>Course Info</th>
                                        <th>Academic Level</th>
                                        <th>Type & Credits</th>
                                        <th>Status & Grade</th>
                                        <th>Regulation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCourses && filteredCourses.length > 0 ? (
                                        filteredCourses.map((course, index) => {
                                            const info = getGradeInfo(course.grade);
                                            const courseDetails = allCourses.find(c => c._id === (course.courseId?._id || course.courseId)) ||
                                                { _id: course.courseId?._id || course.courseId, courseName: "Details Not Found" };

                                            return (
                                                <tr key={index}>
                                                    <td className="course-main-td">
                                                        <div className="course-id-cell">{courseDetails._id}</div>
                                                        <div className="course-name-sub">{courseDetails.courseName}</div>
                                                    </td>
                                                    <td>
                                                        <span className={`level-pill ${courseDetails.courseLevel}`}>
                                                            {courseDetails.courseLevel || "N/A"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="type-tag">{courseDetails.courseType || "N/A"}</div>
                                                        <div className="credits-sub">{courseDetails.courseCredits || 0} Credits</div>
                                                    </td>
                                                    <td>
                                                        <span className={`status-pill ${info.class}`}>
                                                            {info.status}
                                                        </span>
                                                        <div className="grade-display" style={{ marginTop: '5px' }}>
                                                            {course.grade} <span className="letter-grade">({info.letter})</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="reg-badge">
                                                            {courseDetails.courseRegulation || "N/A"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="empty-msg">No courses found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* المودالات */}
            <StudentProgressMapModal
                isOpen={isMapModalOpen}
                onClose={() => setIsMapModalOpen(false)}
                studentData={data}
                allCourses={allCourses}
            />

            <StudentScheduleModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                studentId={id}
            />
        </div>
    );
};

export default AdvisedStudentDetails;