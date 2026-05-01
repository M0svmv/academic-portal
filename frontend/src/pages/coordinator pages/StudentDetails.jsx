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
    Trash2, GitBranch, Edit
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

    const [filterType, setFilterType] = useState("all");
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
            
            setData(res.data);
            setLoading(false);
        } catch (err) {
            setError("Failed to load student data.");
            setLoading(false);
        }
    };

    // دالة تحديث اللائحة (Regulation)
    // const handleUpdateRegulation = async (newRegulation) => {
    //     const oldRegulation = data.transcript.regulation;

    //     if (newRegulation === oldRegulation) return;

    //     const result = await swalService.confirm(
    //         "Update Regulation?",
    //         `You are about to change the student's regulation from "${oldRegulation}" to "${newRegulation}". This may affect credit calculations and graduation requirements. Are you sure?`,
    //         "Yes, update it",
    //         "warning"
    //     );

    //     if (result.isConfirmed) {
    //         try {
    //             swalService.showLoading("Updating Regulation...");
    //             await api.put(`/transcripts/${data.transcript._id}`, {
    //                 regulation: newRegulation
    //             });
    //             await fetchStudentDetails();
    //             swalService.success("Success", `Regulation updated to ${newRegulation}`);
    //         } catch (err) {
    //             console.error(err);
    //             swalService.error("Error", "Failed to update regulation.");
    //             await fetchStudentDetails();
    //         }
    //     } else {
    //         await fetchStudentDetails();
    //     }
    // };

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
    if (!data) return null;

    const { transcript, advisor, semester, semesterWorks } = data;

    const getDisplayCredits = () => {
        if (!transcript) return 0;
        const apiKey = CREDIT_MAP[creditType]?.key;
        return transcript[apiKey] || 0;
    };

    const filteredCourses = transcript.completedCourses?.filter(c => {
        const matchesType = filterType === "all" || (filterType === "failed" ? c.grade < 60 : c.courseId?.courseType === filterType);
        const matchesSearch = c.courseId?.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.courseId?._id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

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

                            {/* تعديل اللائحة - Select Box */}
                            {/* <select
                                className=" badge-select"
                                value={transcript.regulation}
                                onChange={(e) => handleUpdateRegulation(e.target.value)}
                            >
                                <option value="New">New Regulation</option>
                                <option value="last">Last Regulation</option>
                            </select> */}
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
                            {advisor.staffEmail && <span><FaEnvelope /> {advisor.staffEmail}</span>}
                            {advisor.staffPhone && <span><FaPhoneAlt /> {advisor.staffPhone}</span>}
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

            <div className="dashboard-grid">
                <div className={`dash-card primary ${transcript.GPA < 2 ? 'border-danger' : ''}`}>
                    <label>Cumulative GPA</label>
                    <div className="gpa-display">
                        <span className={`gpa-value ${transcript.GPA < 2 ? 'text-danger' : ''}`}>
                            {transcript.GPA?.toFixed(2)}
                        </span>
                        <span className="gpa-max">/ 4.0</span>
                    </div>
                    <div className="mini-progress-bar">
                        <div
                            className="fill"
                            style={{
                                width: `${(transcript.GPA / 4) * 100}%`,
                                backgroundColor: transcript.GPA < 2 ? '#e74c3c' : '#58b777'
                            }}
                        ></div>
                    </div>
                </div>

                <div className={`dash-card alert-card ${failedCount > 0 ? 'border-danger' : ''}`} onClick={() => setFilterType("failed")}>
                    <label>Failing Courses</label>
                    <div className="value-group">
                        <span className="big-val">{failedCount}</span>
                        <FaExclamationTriangle className={failedCount > 0 ? "text-danger" : "text-muted"} />
                    </div>
                    <p className="sub-info">Requires Immediate Action</p>
                </div>

                <div className="dash-card">
                    <div className="card-header-flex">
                        <label>Done Credits</label>
                        <select
                            className="card-select"
                            value={creditType}
                            onChange={(e) => setCreditType(e.target.value)}
                        >
                            {Object.entries(CREDIT_MAP).map(([shortKey, info]) => (
                                <option key={shortKey} value={shortKey}>
                                    {info.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="value-group">
                        <span className="big-val">{getDisplayCredits()}</span>
                        <span className="unit">Hrs</span>
                    </div>
                    <p className="sub-info">From total curriculum</p>
                </div>

                <div className="dash-card">
                    <label>Academic Alerts</label>
                    <div className="value-group">
                        <span className="big-val">{transcript.alerts}</span>
                        <FaInfoCircle className={transcript.alerts > 0 ? "text-warn" : "text-muted"} />
                    </div>
                    <p className="sub-info">System Notifications</p>
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
                                    <th>Grade</th>
                                    {/* <th>Actions</th> */}
                                </tr>
                            </thead>
                            <tbody>
                                {semesterWorks?.length > 0 ? (
                                    semesterWorks.map((work) => (
                                        <tr key={work._id}>
                                            <td className="bold">{work.courseId?._id}</td>
                                            <td>{work.courseId?.courseName}</td>
                                            <td>
                                                <span className="grade-pill">
                                                    {typeof work.grade === 'object' ? work.grade.totalGrade : work.grade}/50
                                                </span>
                                            </td>
                                            {/* <td>
                                                <button
                                                    className="edit-btn-table"
                                                    title="Edit Grade"
                                                    onClick={() => {
                                                        setEditingCourse(work);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            </td> */}
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" className="empty-msg">No courses enrolled this semester</td></tr>
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

                        <div className="filter-search-row">
                            <div className="search-box">
                                <FaSearch />
                                <input type="text" placeholder="Search course..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <select className="filter-dropdown" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                <option value="all">All Courses</option>
                                <option value="core">Core Only</option>
                                <option value="elective1">Electives Only</option>
                                <option value="failed">Failed Only</option>
                            </select>
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
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCourses && filteredCourses.length > 0 ? (
                                        filteredCourses.map((course, index) => {
                                            const info = getGradeInfo(course.grade);
                                            const courseDetails = course.courseId || {};

                                            return (
                                                <tr key={index}>
                                                    <td className="course-main-td">
                                                        <div className="course-code">{courseDetails._id}</div>
                                                        <div className="course-name-sub">{courseDetails.courseName}</div>
                                                    </td>

                                                    <td>
                                                        <span className={`level-pill ${courseDetails.courseLevel}`}>
                                                            {courseDetails.courseLevel}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="type-tag">{courseDetails.courseType}</div>
                                                        <div className="credits-sub">{courseDetails.courseCredits} Credits</div>
                                                    </td>

                                                    {/* عمود الحالة والدرجة */}
                                                    <td>
                                                        <span className={`status-pill ${info.class}`}>
                                                            {info.status}
                                                        </span>
                                                        <div className="grade-display" style={{ marginTop: '5px' }}>
                                                            {course.grade} <span className="letter-grade">({info.letter})</span>
                                                        </div>
                                                    </td>

                                                    {/* عمود اللائحة */}
                                                    <td>
                                                        <span className="reg-badge">
                                                            {courseDetails.courseRegulation}
                                                        </span>
                                                    </td>

                                                    {/* عمود الأزرار */}
                                                    <td className="action-cell">
                                                        <div className="action-flex">
                                                            <button
                                                                className="btn-edit"
                                                                onClick={() => {
                                                                    setEditingCourse(course);
                                                                    setIsEditModalOpen(true);
                                                                }}
                                                                title="Edit Grade"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                className="btn-delete"
                                                                onClick={() => handleDeleteCourse(course._id)}
                                                                title="Remove Course"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr><td colSpan="6" className="empty-msg">No courses found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
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