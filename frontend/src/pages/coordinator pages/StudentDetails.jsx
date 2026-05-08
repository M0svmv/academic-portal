import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import swalService from "../../services/swal";
import "../styles/StudentDetails.css";
import {
    FaTimes, FaClock, FaCalendarAlt, FaArrowLeft, FaPlus, FaUserTie,
    FaExclamationTriangle, FaInfoCircle, FaEnvelope, FaPhoneAlt, FaSearch
} from "react-icons/fa";
import {
    Trash2, GitBranch, Edit, AlertTriangle, Info
    , Loader2
} from 'lucide-react';


import { CalendarDays } from 'lucide-react';

import EditGradeModal from "../../components/EditGradeModal";
import StudentProgressMapModal from "../../components/StudentProgressMap";
import AddCompletedCourseModal from "../../components/AddCompletedCourseModal";



const StudentScheduleModal = ({ isOpen, onClose, studentId }) => {
    const [scheduleData, setScheduleData] = useState(null);
    const [loading, setLoading] = useState(false);
    const daysOfWeek = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

    useEffect(() => {
        if (isOpen && studentId) {
            const fetchSchedule = async () => {
                setLoading(true);
                try {
                    const res = await api.get(`/schedule/student/${studentId}`);
                    console.log(res.data)
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
                                        const periods = scheduleData.schedule?.periodsTime || [];
                                        const pStart = periods[pIdx];
                                        const pEnd = periods[pIdx + 1] || pStart;
                                        return (
                                            <th key={i} style={{ backgroundColor: 'var( --primary-blue-color)', padding: '10px', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#fff' }}>Session {i + 1}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#f8fafc', marginTop: '4px' }}>
                                                    {pStart?.startTime || "-"} - {pEnd?.endTime || "-"}
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
                                            const currentSessionNumber = i + 1; // الجلسة الحالية من 1 إلى 6

                                            // نقوم بفلترة المحاضرات التي تقع ضمن نطاق هذه الجلسة
                                            const courses = scheduleData.offerings?.filter(o =>
                                                o.schedule?.days?.includes(day) &&
                                                Math.ceil(Number(o.schedule.lecPeriod) / 2) === currentSessionNumber
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

const VALID_TYPES = [
    "Core", "Program Elective",
    "General Elective 1", "General Elective 2", "General Elective 3",
    "Engineering Economy Elective", "Project Management Elective",
    "Engineering Physics Elective", "Engineering Mathematics Elective",
    "graduation-project",
    "training",
];
const CREDIT_MAP = {
    total: { label: "Total Credits", key: "completedCredits" },
    core: { label: "Core", key: "coreCompletedCredits" },
    elective1: { label: "Elective 1", key: "elective1CompletedCredits" },
    elective2: { label: "Elective 2", key: "elective2CompletedCredits" },
    elective3: { label: "Elective 3", key: "elective3CompletedCredits" },
    program: { label: "Elective Program", key: "electiveProgramCompletedCredits" },
    economy: { label: "Eng. Economy", key: "engEconomyCompletedCredits" },
    math: { label: "Eng. Math", key: "engMathCompletedCredits" },
    physics: { label: "Eng. Physics", key: "engPhysicsCompletedCredits" },
    project: { label: "Graduation Project", key: "graduationProjectCompletedCredits" },
    management: { label: "Project Management", key: "projectManagementElectiveCompletedCredits" },
    training: { label: "Training", key: "trainingCompletedCredits" }
};

const StudentDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { role } = useParams();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    const [typeFilter, setTypeFilter] = useState("all");
    const [semesterFilter, setSemesterFilter] = useState("all");

    const [statusFilter, setStatusFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [creditType, setCreditType] = useState("total");
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [allCourses, setAllCourses] = useState([]);

    const fetchAllCourses = async () => {
        try {
            const res = await api.get("/courses");
            setAllCourses(res.data);
        } catch (err) {
            console.error("Failed to fetch courses", err);
        }
    };

    const fetchStudentDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/students/${id}/details`);
            console.log(res)

            setData(res.data);
            setLoading(false);
        } catch (err) {
            setError("Failed to load student data.");
            setLoading(false);
        }
    };


    const handleUpdateGrade = async (courseId, newGrade) => {
        try {

            await api.put(`/transcripts/${data.transcript._id}/courses/${courseId}`, {
                grade: newGrade
            });
            await fetchStudentDetails();
            return true;
        } catch (err) {
            throw new Error(err.response?.data?.message || "Failed to update grade.");
        }
    };

    const getGradeInfo = (grade) => {
        if (grade >= 95) return { letter: "A+", class: "safe", status: "Passed" };
        if (grade >= 90) return { letter: "A", class: "safe", status: "Passed" };
        if (grade >= 85) return { letter: "B+", class: "safe", status: "Passed" };
        if (grade >= 80) return { letter: "B", class: "safe", status: "Passed" };
        if (grade >= 75) return { letter: "C+", class: "safe", status: "Passed" };
        if (grade >= 70) return { letter: "C", class: "safe", status: "Passed" };
        if (grade >= 65) return { letter: "D+", class: "safe", status: "Passed" };
        if (grade >= 60) return { letter: "D", class: "safe", status: "Passed" };
        return { letter: "F", class: "risk", status: "Failed" };
    };

    useEffect(() => {
        fetchStudentDetails();
        fetchAllCourses();
    }, [id]);

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
            <h3>Loading Student data...</h3>
        </div>
    );


    if (error) return <div className="error-container"><FaExclamationTriangle size={30} /> {error}</div>;
    if (!data) return null;

    const { transcript, advisor, semester, semesterWorks } = data;

    const getDisplayCredits = () => {
        if (!transcript) return 0;
        const apiKey = CREDIT_MAP[creditType]?.key;
        return transcript[apiKey] || 0;
    };

    const filteredCourses = transcript.completedCourses?.filter(c => {
        const normalize = (str) =>
            str?.toLowerCase().replace(/[\s-]/g, "");

        const matchesType =
            typeFilter === "all" ||
            normalize(c.courseId?.courseType) === normalize(typeFilter);

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "passed" && c.grade >= 60) ||
            (statusFilter === "failed" && c.grade < 60);

        const matchesSemester =
            semesterFilter === "all" ||
            c.semesterId === semesterFilter;

        const matchesSearch =
            c.courseId?.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.courseId?._id?.toLowerCase().includes(searchTerm.toLowerCase());

        return (
            matchesType &&
            matchesStatus &&
            matchesSemester &&
            matchesSearch
        );
    });;

    const failedCount = transcript.completedCourses?.filter(c => c.grade < 60).length || 0;

    const handleDeleteCourse = async (courseId) => {
        const result = await swalService.confirm(
            "Delete Course?",
            "This course will be permanently removed from the student's transcript. GPA will be recalculated.",
            "Yes, Delete it",
            "warning"
        );

        if (result.isConfirmed) {
            try {
                swalService.showLoading("Deleting course...");
                await api.delete(`/transcripts/${transcript._id}/courses/${courseId}`);
                await fetchStudentDetails();
                swalService.success("Deleted", "The course has been removed and records updated.", 1500);
            } catch (err) {
                console.error(err);
                swalService.error("Error", "Failed to delete the course.");
            }
        }
    };
    const groupedCourses = filteredCourses?.reduce((acc, course) => {
        const sem = course.semesterId || "Unknown";

        if (!acc[sem]) {
            acc[sem] = [];
        }

        acc[sem].push(course);
        return acc;
    }, {});

    const sortedSemesters = Object.keys(groupedCourses).sort();

    const semesterOptions = [
        ...new Set(
            transcript.completedCourses
                ?.map(course => course.semesterId)
                .filter(Boolean)
        )
    ].sort();

    const getGPAPoints = (grade) => {
        if (grade >= 93) return 4.0;
        if (grade >= 89) return 3.7;
        if (grade >= 80) return 3.3;
        if (grade >= 75) return 3.0;
        if (grade >= 70) return 2.7;
        if (grade >= 65) return 2.4;
        if (grade >= 60) return 2.0;
        return 0.0;
    };


    return (
        <div className="management-container student-details-wrapper">
            <div className="details-header">
                <div className="header-left">
                    <button className="back-btn-round" onClick={() => window.history.back()}><FaArrowLeft /></button>
                    <div className="student-main-info">
                        <h2>{transcript.studentId?.studentName}</h2>
                        <div className="id-tags">
                            <span className="id-badge">ID: {transcript.studentId?._id}</span>
                            <span className="id-badge">@{transcript.studentId?.username}</span>
                        </div>
                        <div className="status-container">
                            <span className={`badge ${transcript.atRisk ? 'risk' : 'safe'}`}>{transcript.atRisk ? "At Risk" : "Good Standing"}</span>
                            <span className="badge dept">{transcript.department}</span>
                            <span className={`badge level-${transcript.level}`}>{transcript.level}</span>
                            <span className="reg-badge">{transcript.regulation} Regulation</span>


                        </div>
                    </div>
                </div>

                <div className="academic-profile-card">
                    <div className="advisor-info-row">
                        <div className="icon-circle"><FaUserTie /></div>
                        <div>
                            <p className="label">Academic Advisor</p>
                            <p className="name">{advisor?.staffName || "Not Assigned"}</p>
                        </div>
                    </div>
                    {advisor && (
                        <div className="advisor-contact-minimal">
                            {advisor.email && <span><FaEnvelope /> {advisor.email}</span>}
                            {advisor.phone && <span><FaPhoneAlt /> {advisor.phone}</span>}
                        </div>
                    )}
                </div>
            </div>

            <div className="student-contact-bar">
                <div className="contact-item">
                    <FaEnvelope className="icon" />
                    <span className="label">Email:</span>
                    <span className="value">{transcript.studentId?.studentEmail || "N/A"}</span>
                </div>
                <div className="contact-item">
                    <FaPhoneAlt className="icon" />
                    <span className="label">Phone:</span>
                    <span className="value">{transcript.studentId?.studentPhone || "N/A"}</span>
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
                    onClick={() => setStatusFilter("failed")}
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

                        <div className="right-sind" style={{ display: 'flex', gap: '5px' }}>
                            <span className="badge dept">{semester?._id}</span>
                            <button
                                className="enroll-btn-icon"
                                onClick={() => navigate(`/staff/${role}/coordinator/enroll/${data.transcript.studentId?._id}`)}
                                title="Enroll in Courses"
                                style={{
                                    background: '#dcfce7',
                                    color: '#166534',
                                    borderColor: '#bbf7d0',
                                    marginLeft: '5px'
                                }}
                            >
                                <FaPlus size={18} color="#10b981" />
                            </button>
                            {/* زر فتح الجدول الدراسي */}
                            <button className="btn-1" onClick={() => setIsScheduleModalOpen(true)}>
                                <FaCalendarAlt size={16} /> View Study Schedule
                            </button>
                        </div>
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
                            <div className="action-group" style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-1" onClick={() => setIsMapModalOpen(true)}>
                                    <GitBranch size={18} /> Progress Map
                                </button>
                                <button className="btn-1" onClick={() => setIsAddModalOpen(true)}>
                                    <FaPlus /> Add Completed Course
                                </button>
                            </div>
                        </div>

                        <div className="filter-search-row" style={{ marginBottom: '15px' }}>
                            <div className="search-box">
                                <FaSearch />
                                <input type="text" placeholder="Search course..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <select
                                className="filter-dropdown"
                                value={semesterFilter}
                                onChange={(e) => setSemesterFilter(e.target.value)}
                            >
                                <option value="all">All Semesters</option>

                                {semesterOptions.map((semester) => (
                                    <option key={semester} value={semester}>
                                        {semester}
                                    </option>
                                ))}
                            </select>
                            <select value={statusFilter} className="filter-dropdown" onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="all">All Status</option>
                                <option value="passed">Passed</option>
                                <option value="failed">Failed</option>
                            </select>
                            <select
                                className="filter-dropdown"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="all">All Types</option>

                                {VALID_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>


                        {Object.entries(groupedCourses).map(([semester, courses]) => {
                            // حساب إحصائيات الترم الحالي
                            let semesterTotalCredits = 0;
                            let semesterCompletedCredits = 0;
                            let semesterWeightedPoints = 0;

                            courses.forEach(c => {
                                const credits = c.courseId?.courseCredits || 0;
                                semesterTotalCredits += credits;
                                if (c.grade >= 60) {
                                    semesterCompletedCredits += credits;
                                }
                                semesterWeightedPoints += (getGPAPoints(c.grade) * credits);
                            });

                            const semesterGPA = semesterTotalCredits > 0
                                ? (semesterWeightedPoints / semesterTotalCredits).toFixed(2)
                                : "0.00";

                            return (
                                <div key={semester} style={{ marginBottom: "25px" }}>

                                    <div style={{
                                        background: "#f1f5f9",
                                        padding: "10px 15px",
                                        borderRadius: "8px",
                                        marginBottom: "10px",
                                        fontWeight: "600",
                                        color: "#1e293b",
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span>Semester: {semester}</span>
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
                                                {courses.map((course, index) => {
                                                    const info = getGradeInfo(course.grade);
                                                    const courseDetails = course.courseId || {};

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
                                                })}
                                                <tr className="semester-summary-row" style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                                                    <td colSpan="2" style={{ textAlign: 'right', color: '#64748b' }}>Semester Summary:</td>
                                                    <td style={{ color: '#0f172a' }}>
                                                        {semesterCompletedCredits} / {semesterTotalCredits} Hrs Done
                                                    </td>
                                                    <td colSpan="2" style={{ color: '#2563eb' }}>
                                                        Semester GPA: {semesterGPA}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>

            <EditGradeModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleUpdateGrade}
                courseData={editingCourse}
            />

            <AddCompletedCourseModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={() => {
                    fetchStudentDetails();
                    setIsAddModalOpen(false);
                    swalService.success("Course Added", "The transcript has been updated successfully.");
                }}
                transcriptId={transcript._id}
            />

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

export default StudentDetails;