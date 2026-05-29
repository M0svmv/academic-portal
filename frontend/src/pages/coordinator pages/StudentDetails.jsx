import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import swalService from "../../services/swal";
import "../styles/StudentDetails.css";
import {
    FaArrowLeft, FaPlus, FaUserTie,
    FaExclamationTriangle, FaEnvelope, FaPhoneAlt, FaSearch,
    FaCalendarAlt, FaFileDownload,
} from "react-icons/fa";
import { Trash2, GitBranch, Edit, AlertTriangle, Info, Loader2 } from "lucide-react";

import EditGradeModal from "../../components/EditGradeModal";
import StudentProgressMapModal from "../../components/StudentProgressMap";
import AddCompletedCourseModal from "../../components/AddCompletedCourseModal";
import StudentScheduleModal from "../../components/StudentScheduleModal";

import {
    getGradeInfo,
    getGPAPoints,
    filterCompletedCourses,
    groupBySemester,
    calcSemesterStats,
    exportTranscriptPDF,
} from "../../services/Transcriptutils";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
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
    training: { label: "Training", key: "trainingCompletedCredits" },
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
const StudentDetails = () => {
    const navigate = useNavigate();
    const { id, role } = useParams();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allCourses, setAllCourses] = useState([]);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);

    const [typeFilter, setTypeFilter] = useState("all");
    const [semesterFilter, setSemesterFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [creditType, setCreditType] = useState("total");

    // ── Fetchers ──
    const fetchStudentDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/students/${id}/details`);
            setData(res.data);
        } catch {
            setError("Failed to load student data.");
        } finally {
            setLoading(false);
        }
    };

    const fetchAllCourses = async () => {
        try {
            const res = await api.get("/courses");
            setAllCourses(res.data);
        } catch (err) {
            console.error("Failed to fetch courses", err);
        }
    };

    useEffect(() => {
        fetchStudentDetails();
        fetchAllCourses();
    }, [id]);

    // ── Handlers ──
    const handleUpdateGrade = async (courseId, newGrade) => {
        try {
            await api.put(`/transcripts/${data.transcript._id}/courses/${courseId}`, { grade: newGrade });
            await fetchStudentDetails();
            return true;
        } catch (err) {
            throw new Error(err.response?.data?.message || "Failed to update grade.");
        }
    };

    const handleDeleteCourse = async (courseId) => {
        const result = await swalService.confirm(
            "Delete Course?",
            "This course will be permanently removed from the student's transcript. GPA will be recalculated.",
            "Yes, Delete it",
            "warning"
        );
        if (!result.isConfirmed) return;

        try {
            swalService.showLoading("Deleting course...");
            await api.delete(`/transcripts/${transcript._id}/courses/${courseId}`);
            await fetchStudentDetails();
            swalService.success("Deleted", "The course has been removed and records updated.", 1500);
        } catch (err) {
            console.error(err);
            swalService.error("Error", "Failed to delete the course.");
        }
    };

    // ── Guards ──
    if (loading) return (
        <div className="management-container" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "80vh", flexDirection: "column", gap: "14px",
        }}>
            <Loader2 size={42} style={{ animation: "spin 1s linear infinite", color: "#2563eb" }} />
            <h3>Loading Student data...</h3>
        </div>
    );

    if (error) return (
        <div className="error-container">
            <FaExclamationTriangle size={30} /> {error}
        </div>
    );

    if (!data) return null;

    // ── Destructure after guards ──
    const { transcript, advisor, semester, semesterWorks } = data;
    const advisorName = advisor?.staffName || "Not Assigned";

    // ── Derived state ──
    const getDisplayCredits = () => transcript?.[CREDIT_MAP[creditType]?.key] || 0;

    const failedCount = transcript.completedCourses?.filter((c) => c.grade < 60).length || 0;

    const filteredCourses = filterCompletedCourses(transcript.completedCourses, {
        typeFilter, statusFilter, semesterFilter, searchTerm,
    });

    const groupedCourses = groupBySemester(filteredCourses);
    const sortedSemesters = Object.keys(groupedCourses).sort();

    const semesterOptions = [
        ...new Set(
            transcript.completedCourses?.map((c) => c.semesterId).filter(Boolean)
        ),
    ].sort();

    // ── Render ──
    return (
        <div className="management-container student-details-wrapper">

            {/* ── Header ── */}
            <div className="details-header">
                <div className="header-left">
                    <button className="back-btn-round" onClick={() => window.history.back()}>
                        <FaArrowLeft />
                    </button>
                    <div className="student-main-info">
                        <h2>{transcript.studentId?.studentName}</h2>
                        <div className="id-tags">
                            <span className="id-badge">ID: {transcript.studentId?._id}</span>
                            <span className="id-badge">@{transcript.studentId?.username}</span>
                            <span
                                className="id-badge"
                                onClick={() =>
                                    exportTranscriptPDF({
                                        transcript,
                                        advisor,
                                        semester,
                                        semesterWorks: semesterWorks || [],
                                        extractedByRole: "Coordinator",
                                    })
                                }
                                style={{ cursor: "pointer", background: "#3498db", color: "white" }}
                            >
                                <FaFileDownload /> Export PDF
                            </span>
                        </div>
                        <div className="status-container">
                            <span className={`badge ${transcript.atRisk ? "risk" : "safe"}`}>
                                {transcript.atRisk ? "At Risk" : "Good Standing"}
                            </span>
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
                            <p className="name">{advisorName}</p>
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

            {/* ── Contact bar ── */}
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

            {/* ── Dashboard cards ── */}
            <div className="dashboard-grid">

                {/* GPA */}
                <div className={`dash-card ${transcript.GPA < 2 ? "border-danger" : ""}`}>
                    <div className="card-header-flex">
                        <label className="card-label">Cumulative GPA</label>
                        <span className="status-indicator" style={{ backgroundColor: transcript.GPA < 2 ? "#ef4444" : "#10b981" }} />
                    </div>
                    <div className="value-group">
                        <span className={`big-val ${transcript.GPA < 2 ? "text-danger" : ""}`}>
                            {transcript.GPA?.toFixed(2)}
                        </span>
                        <span className="val-unit">/ 4.0</span>
                    </div>
                    <div className="mini-progress-container">
                        <div className="progress-fill" style={{
                            width: `${(transcript.GPA / 4) * 100}%`,
                            backgroundColor: transcript.GPA < 2 ? "#ef4444" : "#10b981",
                        }} />
                    </div>
                </div>

                {/* Failing courses */}
                <div
                    className={`dash-card alert-card ${failedCount > 0 ? "border-danger active-alert" : ""}`}
                    onClick={() => setStatusFilter("failed")}
                >
                    <div className="card-header-flex">
                        <label className="card-label">Failing Courses</label>
                        <AlertTriangle size={18} style={{ color: failedCount > 0 ? "#f59e0b" : "#94a3b8" }} />
                    </div>
                    <div className="value-group">
                        <span className="big-val" style={{ color: failedCount > 0 ? "#ef4444" : "#1e293b" }}>
                            {failedCount}
                        </span>
                    </div>
                    <p className="sub-info" style={{ color: failedCount > 0 ? "#ef4444" : "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        {failedCount > 0 ? "● Requires Immediate Action" : "All courses passed"}
                    </p>
                </div>

                {/* Done Credits */}
                <div className="dash-card">
                    <div className="card-header-flex">
                        <label className="card-label">Done Credits</label>
                        <select className="card-select" value={creditType} onChange={(e) => setCreditType(e.target.value)}>
                            {Object.entries(CREDIT_MAP).map(([key, info]) => (
                                <option key={key} value={key}>{info.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="value-group">
                        <span className="big-val">{getDisplayCredits()}</span>
                        <span className="val-unit" style={{ fontWeight: "600", color: "#64748b" }}>Hrs</span>
                    </div>
                    <p className="sub-info" style={{ color: "#94a3b8", fontWeight: "500" }}>
                        From total curriculum requirements
                    </p>
                </div>

                {/* Academic Alerts */}
                <div className="dash-card">
                    <div className="card-header-flex" style={{ marginBottom: "12px" }}>
                        <label className="card-label">Academic Alerts</label>
                        {transcript.alerts > 0
                            ? <AlertTriangle size={18} style={{ color: "#ef4444" }} />
                            : <Info size={18} style={{ color: "#94a3b8" }} />
                        }
                    </div>
                    <div className="alerts-stats-grid">
                        <div className="stat-box">
                            <span className="stat-label">Consecutive</span>
                            <span className="big-val" style={{ fontSize: "24px", color: transcript.alerts >= 3 ? "#ef4444" : "#1e293b" }}>
                                {transcript.alerts} <span className="val-unit">/ 4</span>
                            </span>
                        </div>
                        <div className="stat-box bordered">
                            <span className="stat-label">Total</span>
                            <span className="big-val" style={{ fontSize: "24px", color: transcript.totalAlerts >= 5 ? "#ef4444" : "#1e293b" }}>
                                {transcript.totalAlerts} <span className="val-unit">/ 6</span>
                            </span>
                        </div>
                    </div>
                    <p className="alert-policy-box">
                        Dismissal policy: 6 total alerts or 4 consecutive will lead to expulsion.
                    </p>
                </div>
            </div>

            {/* ── Semester Works ── */}
            <div className="data-section">
                <div className="section-title-bar">
                    <h3>Current Semester Works</h3>
                    <div className="right-sind" style={{ display: "flex", gap: "5px" }}>
                        <span className="badge dept">{semester?._id || "No semester opened"}</span>
                        <button
                            className="enroll-btn-icon"
                            onClick={() => navigate(`/staff/${role}/coordinator/enroll/${data.transcript.studentId?._id}`)}
                            title="Enroll in Courses"
                            style={{ background: "#dcfce7", color: "#166534", borderColor: "#bbf7d0", marginLeft: "5px" }}
                        >
                            <FaPlus size={18} color="#10b981" />
                        </button>
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
                                    const g = typeof work.grade === "object" ? work.grade : {};
                                    const semesterTotal =
                                        (g.midTermGrade ?? 0) + (g.labGrade ?? 0) +
                                        (g.practicalGrade ?? 0) + (g.attendanceGrade ?? 0) +
                                        (g.bonusGrade ?? 0);
                                    const gradeStatusClass =
                                        semesterTotal < 30 ? "low-grade" :
                                            semesterTotal >= 40 ? "high-grade" : "";

                                    return (
                                        <tr key={work._id}>
                                            <td className="course-id-cell">{work.courseId?._id}</td>
                                            <td>{work.courseId?.courseName}</td>
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
                                <tr>
                                    <td colSpan="8" className="empty-msg">No courses enrolled this semester</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Academic Transcript ── */}
                <div className="data-section" style={{ marginTop: "2rem" }}>
                    <div className="section-title-bar">
                        <h3>Academic Transcript</h3>
                        <div className="action-group" style={{ display: "flex", gap: "10px" }}>
                            <button className="btn-1" onClick={() => setIsMapModalOpen(true)}>
                                <GitBranch size={18} /> Progress Map
                            </button>
                            <button className="btn-1" onClick={() => setIsAddModalOpen(true)}>
                                <FaPlus /> Add Completed Course
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="filter-search-row" style={{ marginBottom: "15px" }}>
                        <div className="search-box">
                            <FaSearch />
                            <input
                                type="text"
                                placeholder="Search course..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select className="filter-dropdown" value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)}>
                            <option value="all">All Semesters</option>
                            {semesterOptions.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <select className="filter-dropdown" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="all">All Status</option>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                        </select>
                        <select className="filter-dropdown" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                            <option value="all">All Types</option>
                            {VALID_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    {/* Grouped tables */}
                    {sortedSemesters.map((sem) => {
                        const courses = groupedCourses[sem];
                        const { totalCredits, completedCredits, gpa } = calcSemesterStats(courses);

                        return (
                            <div key={sem} style={{ marginBottom: "25px" }}>
                                <div style={{
                                    background: "#f1f5f9", padding: "10px 15px", borderRadius: "8px",
                                    marginBottom: "10px", fontWeight: "600", color: "#1e293b",
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                }}>
                                    <span>Semester: {sem}</span>
                                </div>
                                <div className="table-wrapper">
                                    <table className="modern-table dynamic-table">
                                        <thead>
                                            <tr>
                                                <th>Course Info</th>
                                                <th>Academic Level</th>
                                                <th>Type &amp; Credits</th>
                                                <th>Status &amp; Grade</th>
                                                <th>Regulation</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {courses.map((course, index) => {
                                                const info = getGradeInfo(course.grade);
                                                const cd = course.courseId || {};
                                                return (
                                                    <tr key={index}>
                                                        <td className="course-main-td">
                                                            <div className="course-id-cell">{cd._id}</div>
                                                            <div className="course-name-sub">{cd.courseName}</div>
                                                        </td>
                                                        <td>
                                                            <span className={`level-pill ${cd.courseLevel}`}>
                                                                {cd.courseLevel || "N/A"}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="type-tag">{cd.courseType || "N/A"}</div>
                                                            <div className="credits-sub">{cd.courseCredits || 0} Credits</div>
                                                        </td>
                                                        <td>
                                                            <span className={`status-pill ${info.class}`}>{info.status}</span>
                                                            <div className="grade-display" style={{ marginTop: "5px" }}>
                                                                {course.grade} <span className="letter-grade">({info.letter})</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="reg-badge">{cd.courseRegulation || "N/A"}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="semester-summary-row" style={{ backgroundColor: "#f8fafc", fontWeight: "bold" }}>
                                                <td colSpan="2" style={{ textAlign: "right", color: "#64748b" }}>
                                                    Semester Summary:
                                                </td>
                                                <td style={{ color: "#0f172a" }}>
                                                    {completedCredits} / {totalCredits} Hrs Done
                                                </td>
                                                <td colSpan="2" style={{ color: "#2563eb" }}>
                                                    Semester GPA: {gpa}
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

            {/* ── Modals ── */}
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