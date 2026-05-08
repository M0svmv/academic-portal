import React, { useEffect, useState } from "react";
import api from "../services/api";
import "./styles/StudentDetails.css";
import "./styles/Transcript.css";
import swalService from "../services/swal";
import {
    FaUserTie, FaExclamationTriangle, FaInfoCircle, FaPhoneAlt,
    FaArrowLeft, FaTimes, FaClock, FaCalendarAlt,
    FaEnvelope, FaSearch, FaFileDownload
} from "react-icons/fa";

import {
    Trash2, GitBranch, AlertTriangle, Info
    , Loader2
} from 'lucide-react';
import TranscriptProgressMapModal from "../components/TranscriptProgressMapModal";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
const VALID_TYPES = [
    "Core", "Program Elective",
    "General Elective 1", "General Elective 2", "General Elective 3",
    "Engineering Economy Elective", "Project Management Elective",
    "Engineering Physics Elective", "Engineering Mathematics Elective",
    "graduation-project",
    "training",
];

const CREDIT_MAP = {
    total: { label: "Total Completed", key: "completedCredits" },
    allowed: { label: "Allowed (Next Reg.)", key: "allowedCredits" },
    core: { label: "Core Courses", key: "coreCompletedCredits" },
    elective1: { label: "Elective 1", key: "elective1CompletedCredits" },
    elective2: { label: "Elective 2", key: "elective2CompletedCredits" },
    elective3: { label: "Elective 3", key: "elective3CompletedCredits" },
    program: { label: "Elective Program", key: "electiveProgramCompletedCredits" },
    math: { label: "Eng. Math", key: "engMathCompletedCredits" },
    physics: { label: "Eng. Physics", key: "engPhysicsCompletedCredits" },
    economy: { label: "Eng. Economy", key: "engEconomyCompletedCredits" },
    project: { label: "Grad. Project", key: "graduationProjectCompletedCredits" },
    management: { label: "Project Management", key: "projectManagementElectiveCompletedCredits" },
    training: { label: "Training", key: "trainingCompletedCredits" }
};

const StudentTranscript = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [typeFilter, setTypeFilter] = useState("all");
    const [semesterFilter, setSemesterFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [creditType, setCreditType] = useState("total");

    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [allCourses, setAllCourses] = useState([]);

    const fetchAllCourses = async () => {
        try {
            const res = await api.get("/student/me/courses");
            setAllCourses(res.data.courses || []);
        } catch (err) {
            console.error("Failed to fetch courses", err);
        }
    };

    const fetchMyDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get("/student/me/details");
            console.log(res.data)
            setData(res.data);
            setLoading(false);
        } catch (err) {
            setError("Failed to load transcript data.");
            setLoading(false);
        }
    };

    const handleFailedCardClick = () => {
        setStatusFilter(prev => prev === "failed" ? "all" : "failed");
    };

    const getGradeDisplay = (grade, status) => {
        const isPassed = status?.toLowerCase() === "passed";
        return {
            letter: grade >= 60 ? (grade >= 90 ? "A" : grade >= 80 ? "B" : grade >= 70 ? "C" : "D") : "F",
            class: isPassed ? "safe" : "risk",
            label: isPassed ? "Passed" : "Failed"
        };
    };

    useEffect(() => {
        fetchMyDetails();
        fetchAllCourses();
    }, []);

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
            <h3>Loading Transcript...</h3>
        </div>
    );
    if (error) return <div className="error-container"><FaExclamationTriangle size={30} /> {error}</div>;
    if (!data) return null;

    const { transcript, advisor, semester, semesterWorks } = data;

    const getDisplayCredits = () => {
        const apiKey = CREDIT_MAP[creditType]?.key;
        return transcript[apiKey] || 0;
    };

    const getGradeInfo = (grade) => {
        if (grade >= 90) return { letter: "A", class: "safe", status: "Passed" };
        if (grade >= 80) return { letter: "B", class: "safe", status: "Passed" };
        if (grade >= 70) return { letter: "C", class: "safe", status: "Passed" };
        if (grade >= 60) return { letter: "D", class: "safe", status: "Passed" };
        return { letter: "F", class: "risk", status: "Failed" };
    };

    const handleExportPDF = async () => {
        swalService.showLoading("Generating your official academic transcript...");

        try {
            const doc = new jsPDF();
            const studentName = String(transcript.studentId?.studentName || "N/A");
            const studentId = String(transcript.studentId?._id || "N/A");

            // --- Header & Branding ---
            doc.setFontSize(22);
            doc.setTextColor(20, 83, 136);
            doc.text("Official Academic Transcript", 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
            doc.line(14, 30, 196, 30);

            // --- Student Profile Info ---
            doc.setFontSize(11);
            doc.setTextColor(40);
            doc.setFont(undefined, 'bold');
            doc.text(`Student Name:`, 14, 40);
            doc.setFont(undefined, 'normal');
            doc.text(studentName, 45, 40);

            doc.setFont(undefined, 'bold');
            doc.text(`Student ID:`, 14, 46);
            doc.setFont(undefined, 'normal');
            doc.text(studentId, 45, 46);

            doc.setFont(undefined, 'bold');
            doc.text(`Department:`, 14, 52);
            doc.setFont(undefined, 'normal');
            doc.text(String(transcript.department || "N/A"), 45, 52);

            // Stats Box
            doc.setDrawColor(20, 83, 136);
            doc.setFillColor(248, 250, 252);
            doc.rect(130, 35, 66, 28, 'F');
            doc.setTextColor(20, 83, 136);
            doc.setFont(undefined, 'bold');
            doc.text(`Cumulative GPA: ${Number(transcript.GPA || 0).toFixed(2)}`, 135, 42);
            doc.setTextColor(0);
            doc.setFont(undefined, 'normal');
            doc.text(`Total Credits: ${transcript.completedCredits || 0} Hrs`, 135, 50);
            doc.text(`Academic Level: ${transcript.level || "N/A"}`, 135, 58);

            let currentY = 75;

            // --- Table 1: Semester Works ---
            if (semesterWorks && semesterWorks.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(20, 83, 136);
                doc.text(`Current Semester Works`, 14, currentY);

                const worksBody = semesterWorks.map(w => [
                    String(w.courseId?._id || "N/A"),
                    String(w.courseId?.courseName || "N/A"),
                    String(w.grade?.totalGrade ?? "0")
                ]);

                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['Code', 'Course Name', 'Work Grade (50)']],
                    body: worksBody,
                    headStyles: { fillColor: [46, 204, 113] },
                    margin: { left: 14, right: 14 },
                    theme: 'striped'
                });
                currentY = doc.lastAutoTable.finalY + 15;
            }

            if (currentY > 240) { doc.addPage(); currentY = 20; }

            doc.setFontSize(14);
            doc.setTextColor(20, 83, 136);
            doc.text("Academic History", 14, currentY);

            const historyBody = (transcript.completedCourses || []).map(c => {
                const info = getGradeDisplay(c.grade, c.status);
                return [
                    String(c.courseId?._id || "N/A"),
                    String(c.courseId?.courseName || "N/A"),
                    String(info.label),
                    String(c.grade ?? "0"),
                    String(info.letter)
                ];
            });

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Code', 'Course Name', 'Status', 'Grade', 'Letter']],
                body: historyBody,
                headStyles: { fillColor: [52, 73, 94] },
                margin: { left: 14, right: 14 },
                theme: 'striped'
            });

            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(9);
                doc.setTextColor(150);
                doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
            }

            doc.save(`Official_Transcript_${studentId}.pdf`);
            swalService.success("Success", "Academic transcript exported successfully.");
        } catch (err) {
            console.error("PDF Export Error:", err);
            swalService.error("Export Failed", "Error: " + err.message);
        }
    };

    const contactAdvisor = (email) => {
        swalService.confirm(
            "Contact Advisor",
            `Do you want to send an email to ${email}?`,
            "Open Mail App"
        ).then((result) => {
            if (result.isConfirmed) {
                window.location.href = `mailto:${email}`;
            }
        });
    };

    const showRiskInfo = () => {
        swalService.info(
            "Academic Status",
            "Your status is 'At Risk' because your GPA is below 2.0 or you have failed multiple courses. Please consult your advisor."
        );
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

    return (
        <div className="management-container student-details-wrapper">
            <div className="details-header">
                <div className="header-left">
                    <div className="student-main-info">
                        <h2>{transcript.studentId?.studentName}</h2>
                        <div className="id-tags">
                            <span className="id-badge">ID: {transcript.studentId?._id}</span>
                            <span className="id-badge">@{transcript.studentId?.username}</span>
                            <span className="id-badge" onClick={handleExportPDF} style={{ cursor: 'pointer', background: '#3498db', color: 'white' }}>
                                <FaFileDownload /> Export PDF
                            </span>
                        </div>
                        <div className="status-container">
                            <span
                                className={`badge ${transcript.atRisk ? 'risk' : 'safe'}`}
                                onClick={transcript.atRisk ? showRiskInfo : null}
                                style={transcript.atRisk ? { cursor: 'help' } : {}}
                            >
                                {transcript.atRisk ? "At Risk" : "Good Standing"}
                            </span>

                            <span className="badge dept">{transcript.department}</span>
                            <span className={`badge level-${transcript.level}`}>{transcript.level}</span>
                            <span className={`badge reg-${transcript.regulation?.toLowerCase()}`}>
                                {transcript.regulation} Regulation
                            </span>
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
                    {advisor?.email && (
                        <div className="advisor-contact-minimal" onClick={() => contactAdvisor(advisor.email)} style={{ cursor: 'pointer' }}>
                            <span><FaEnvelope /> {advisor.email}</span>
                        </div>
                    )}
                    {advisor?.phone && (
                        <div className="advisor-contact-minimal" onClick={() => contactAdvisor(advisor.phone)} style={{ cursor: 'pointer' }}>
                            <span><FaPhoneAlt /> {advisor.phone}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="dashboard-grid">
                {/* GPA Card */}
                <div className={`dash-card ${transcript.GPA < 2 ? 'border-danger' : ''}`}>
                    <div className="card-header-flex">
                        <label className="card-label">Cumulative GPA</label>
                        <span
                            className="status-indicator"
                            style={{ backgroundColor: transcript.GPA < 2 ? '#ef4444' : '#10b981' }}
                        ></span>
                    </div>
                    <div className="value-group">
                        <span className={`big-val ${transcript.GPA < 2 ? 'text-danger' : ''}`}>
                            {transcript.GPA?.toFixed(2)}
                        </span>
                        <span className="val-unit">/ 4.0</span>
                    </div>
                    <div className="mini-progress-container">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${(transcript.GPA / 4) * 100}%`,
                                backgroundColor: transcript.GPA < 2 ? '#ef4444' : '#10b981',
                            }}
                        ></div>
                    </div>
                </div>

                {/* Failing Courses Card */}
                <div
                    className={`dash-card alert-card ${failedCount > 0 ? 'border-danger active-alert' : ''}`}
                    onClick={() => setStatusFilter("failed")}
                >
                    <div className="card-header-flex">
                        <label className="card-label">Failing Courses</label>
                        <AlertTriangle
                            size={18}
                            style={{ color: failedCount > 0 ? '#f59e0b' : '#94a3b8' }}
                        />
                    </div>
                    <div className="value-group">
                        <span className="big-val" style={{ color: failedCount > 0 ? '#ef4444' : '#1e293b' }}>
                            {failedCount}
                        </span>
                    </div>
                    <p className="sub-info" style={{ color: failedCount > 0 ? '#ef4444' : '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {failedCount > 0 ? "● Requires Immediate Action" : "All courses passed"}
                    </p>
                </div>

                {/* Done Credits Card */}
                <div className="dash-card">
                    <div className="card-header-flex">
                        <label className="card-label">Done Credits</label>
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
                        <span className="val-unit" style={{ fontWeight: '600', color: '#64748b' }}>Hrs</span>
                    </div>
                    <p className="sub-info" style={{ color: '#94a3b8', fontWeight: '500' }}>
                        From total curriculum requirements
                    </p>
                </div>

                {/* Academic Alerts Card */}
                <div className="dash-card">
                    <div className="card-header-flex" style={{ marginBottom: '12px' }}>
                        <label className="card-label">Academic Alerts</label>
                        {transcript.alerts > 0 ? (
                            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                        ) : (
                            <Info size={18} style={{ color: '#94a3b8' }} />
                        )}
                    </div>

                    <div className="alerts-stats-grid">
                        <div className="stat-box">
                            <span className="stat-label">Consecutive</span>
                            <span className="big-val" style={{ fontSize: '24px', color: transcript.alerts >= 3 ? '#ef4444' : '#1e293b' }}>
                                {transcript.alerts} <span className="val-unit">/ 4</span>
                            </span>
                        </div>
                        <div className="stat-box bordered">
                            <span className="stat-label">Total</span>
                            <span className="big-val" style={{ fontSize: '24px', color: transcript.totalAlerts >= 5 ? '#ef4444' : '#1e293b' }}>
                                {transcript.totalAlerts} <span className="val-unit">/ 6</span>
                            </span>
                        </div>
                    </div>

                    <p className="alert-policy-box">
                        Dismissal policy: 6 total alerts or 4 consecutive will lead to expulsion.
                    </p>
                </div>
            </div>

            <div className="details-content-sections">
                <div className="data-section">
                    <div className="section-title-bar">
                        <h3>Semester Works</h3>
                        <span className="badge dept">{semester?.name}</span>
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
                </div>

                <div className="data-section" style={{ marginTop: '2rem' }}>
                    <div className="section-title-bar">
                        <h3>Academic Transcript</h3>
                        <button className="btn-1" onClick={() => setIsMapModalOpen(true)}>
                            <GitBranch size={18} /> View Progress Map
                        </button>
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

                    {Object.entries(groupedCourses).map(([semester, courses]) => (
                        <div key={semester} style={{ marginBottom: "25px" }}>

                            {/* عنوان السيمستر */}
                            <div style={{
                                background: "#f1f5f9",
                                padding: "10px 15px",
                                borderRadius: "8px",
                                marginBottom: "10px",
                                fontWeight: "600",
                                color: "#1e293b"
                            }}>
                                Semester: {semester}
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
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <TranscriptProgressMapModal
                isOpen={isMapModalOpen}
                onClose={() => setIsMapModalOpen(false)}
                studentData={data}
                allCourses={allCourses}
            />
        </div>
    );
};

export default StudentTranscript;