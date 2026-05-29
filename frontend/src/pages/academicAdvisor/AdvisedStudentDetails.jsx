import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import swalService from "../../services/swal";
import "../styles/StudentDetails.css";
import {
    FaArrowLeft, FaUserTie,
    FaExclamationTriangle, FaInfoCircle, FaEnvelope, FaPhoneAlt, FaSearch,
    FaCalendarAlt, FaTimes, FaClock, FaFileDownload
} from "react-icons/fa";
import { GitBranch, CalendarDays, AlertTriangle, Info, Loader2 } from 'lucide-react';

import StudentProgressMapModal from "../../components/StudentProgressMap";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


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
                <div className="sc-table-wrapper">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}><div className="loader"></div></div>
                    ) : scheduleData ? (
                        <table className="modern-schedule-table">
                            <thead>
                                <tr>
                                    <th style={{ backgroundColor: 'var(--primary-blue-color)', color: 'f8fafc', padding: '15px', borderRadius: '8px', minWidth: '100px' }}>Days</th>
                                    {[...Array(6)].map((_, i) => {
                                        const pIdx = i * 2;
                                        const periods = scheduleData.schedule?.periodsTime || [];
                                        const pStart = periods[pIdx];
                                        const pEnd = periods[pIdx + 1] || pStart;
                                        return (
                                            <th key={i} style={{ backgroundColor: 'var(--primary-blue-color)', padding: '10px', borderRadius: '8px' }}>
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
                                            const currentSessionNumber = i + 1;
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

    const [typeFilter, setTypeFilter] = useState("all");
    const [semesterFilter, setSemesterFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [creditType, setCreditType] = useState("total");
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [allCourses, setAllCourses] = useState([]);

    const fetchAllCourses = async () => {
        try {
            const res = await api.get("/academic-advisors/me/courses");
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
            console.log(res.data);
            setLoading(false);
        } catch (err) {
            setError("Failed to load student data.");
            setLoading(false);
        }
    };

    const getGradeInfo = (grade) => {
        if (grade >= 97) return { letter: "A+", class: "safe", status: "Passed" };
        if (grade >= 93) return { letter: "A", class: "safe", status: "Passed" };
        if (grade >= 89) return { letter: "A-", class: "safe", status: "Passed" };
        if (grade >= 84) return { letter: "B+", class: "safe", status: "Passed" };
        if (grade >= 80) return { letter: "B", class: "safe", status: "Passed" };
        if (grade >= 76) return { letter: "B-", class: "safe", status: "Passed" };
        if (grade >= 73) return { letter: "C+", class: "safe", status: "Passed" };
        if (grade >= 70) return { letter: "C", class: "safe", status: "Passed" };
        if (grade >= 67) return { letter: "C-", class: "warning", status: "Passed" };
        if (grade >= 64) return { letter: "D+", class: "warning", status: "Passed" };
        if (grade >= 60) return { letter: "D", class: "warning", status: "Passed" };
        return { letter: "F", class: "risk", status: "Failed" };
    };

    const getGPAPoints = (grade) => {
        if (grade >= 93) return 4.00;
        if (grade >= 89) return 3.70;
        if (grade >= 84) return 3.30;
        if (grade >= 80) return 3.00;
        if (grade >= 76) return 2.70;
        if (grade >= 73) return 2.30;
        if (grade >= 70) return 2.00;
        if (grade >= 67) return 1.70;
        if (grade >= 64) return 1.30;
        if (grade >= 60) return 1.00;
        return 0.00;
    };

    // ─────────────────────────────────────────────────────────────
    // Helper: هل النص يحتوي على حروف عربية؟
    // ─────────────────────────────────────────────────────────────
    const containsArabic = (text) => /[\u0600-\u06FF]/.test(text);

    // ─────────────────────────────────────────────────────────────
    // Helper: عكس النص العربي عشان jsPDF يعرضه صح (RTL workaround)
    // ─────────────────────────────────────────────────────────────
    const reverseArabic = (text) => {
        if (!text) return "";
        if (!containsArabic(String(text))) return String(text);
        return String(text).split("").reverse().join("");
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
            <h3>Loading Student details...</h3>
        </div>
    );
    if (error) return <div className="error-container"><FaExclamationTriangle size={30} /> {error}</div>;
    if (!data || !data.transcript) return null;

    // ── destructuring بعد التأكد من وجود data ──
    const { transcript, semesterWorks, advisor, semester } = data;

    // ─────────────────────────────────────────────────────────────
    // handleExportPDF — هنا بعد الـ destructuring عشان transcript
    // و advisor يكونوا متاحين بدون مشكلة
    // ─────────────────────────────────────────────────────────────
    const handleExportPDF = async () => {
        swalService.showLoading("Generating official academic transcript...");

        try {
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

            const studentName = String(transcript.studentId?.studentName || "N/A");
            const studentId = String(transcript.studentId?._id || "N/A");
            const studentUsername = String(transcript.studentId?.username || "N/A");
            const studentEmail = String(transcript.studentId?.studentEmail || "N/A");
            const studentPhone = String(transcript.studentId?.studentPhone || "N/A");
            const department = String(transcript.department || "N/A");
            const regulation = String(transcript.regulation || "N/A");
            const level = String(transcript.level || "N/A");
            const gpa = Number(transcript.GPA || 0).toFixed(2);
            const totalCredits = transcript.completedCredits || 0;
            const atRisk = transcript.atRisk;
            const alerts = transcript.alerts || 0;
            const totalAlerts = transcript.totalAlerts || 0;

            // بيانات الـ Academic Advisor (مُستخرج البيان)
            const advisorName = String(advisor?.staffName || "N/A");
            const advisorEmail = String(advisor?.email || "N/A");

            // ── ألوان السيستم ──
            const COLOR_DARK = [30, 41, 59];
            const COLOR_BLUE = [37, 99, 235];
            const COLOR_GREEN = [16, 185, 129];
            const COLOR_RED = [239, 68, 68];
            const COLOR_AMBER = [245, 158, 11];
            const COLOR_LIGHT_BG = [241, 245, 249];
            const COLOR_MUTED = [100, 116, 139];
            const COLOR_WHITE = [255, 255, 255];
            const COLOR_SUMMARY_BG = [248, 250, 252];

            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 14;

            // ══════════════════════════════════════════════════
            // HEADER BAR
            // ══════════════════════════════════════════════════
            doc.setFillColor(...COLOR_DARK);
            doc.rect(0, 0, pageW, 22, "F");

            doc.setFontSize(14);
            doc.setTextColor(...COLOR_WHITE);
            doc.setFont(undefined, "bold");
            doc.text("Official Academic Transcript", margin, 14);

            doc.setFontSize(9);
            doc.setFont(undefined, "normal");
            doc.setTextColor(203, 213, 225);
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 14, { align: "right" });

            // ══════════════════════════════════════════════════
            // STUDENT INFO BLOCK  (2 columns)
            // ══════════════════════════════════════════════════
            let y = 30;

            const leftData = [
                ["Student Name", studentName],
                ["Student ID", studentId],
                ["Username", `@${studentUsername}`],
                ["Email", studentEmail],
                ["Phone", studentPhone],
                ["Department", department],
                ["Regulation", `${regulation} Regulation`],
                ["Academic Level", level],
            ];

            doc.setFontSize(10);
            leftData.forEach(([label, value]) => {
                doc.setFont(undefined, "bold");
                doc.setTextColor(...COLOR_MUTED);
                doc.text(`${label}:`, margin, y);

                doc.setFont(undefined, "normal");
                doc.setTextColor(...COLOR_DARK);
                const displayValue = containsArabic(value) ? reverseArabic(value) : value;
                doc.text(displayValue, margin + 38, y);
                y += 6;
            });

            // Right column – GPA box
            const boxX = pageW - margin - 66;
            const boxY = 28;
            const boxW = 66;
            const boxH = 42;

            doc.setFillColor(...COLOR_LIGHT_BG);
            doc.setDrawColor(...COLOR_BLUE);
            doc.setLineWidth(0.5);
            doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, "FD");

            doc.setFontSize(11);
            doc.setFont(undefined, "bold");
            doc.setTextColor(...COLOR_BLUE);
            doc.text(`GPA: ${gpa} / 4.0`, boxX + boxW / 2, boxY + 10, { align: "center" });

            doc.setFontSize(9);
            doc.setTextColor(...COLOR_DARK);
            doc.setFont(undefined, "normal");
            doc.text(`Total Credits: ${totalCredits} Hrs`, boxX + boxW / 2, boxY + 19, { align: "center" });
            doc.text(`Level: ${level}`, boxX + boxW / 2, boxY + 27, { align: "center" });

            const statusColor = atRisk ? COLOR_RED : COLOR_GREEN;
            doc.setFillColor(...statusColor);
            doc.roundedRect(boxX + 8, boxY + 33, boxW - 16, 7, 2, 2, "F");
            doc.setFontSize(8);
            doc.setTextColor(...COLOR_WHITE);
            doc.setFont(undefined, "bold");
            doc.text(atRisk ? "At Risk" : "Good Standing", boxX + boxW / 2, boxY + 37.5, { align: "center" });

            y = Math.max(y, boxY + boxH) + 6;

            // ── Alerts summary ──
            doc.setFillColor(255, 251, 235);
            doc.setDrawColor(...COLOR_AMBER);
            doc.setLineWidth(0.4);
            doc.roundedRect(margin, y, pageW - margin * 2, 10, 2, 2, "FD");
            doc.setFontSize(9);
            doc.setFont(undefined, "normal");
            doc.setTextColor(120, 80, 0);
            doc.text(
                `Academic Alerts — Consecutive: ${alerts}/4   |   Total: ${totalAlerts}/6   |   Advisor: ${advisorName}`,
                margin + 3, y + 6.5
            );
            y += 16;

            // ══════════════════════════════════════════════════
            // EXTRACTED BY BOX  (Academic Advisor)
            // ══════════════════════════════════════════════════
            doc.setFillColor(239, 246, 255);
            doc.setDrawColor(...COLOR_BLUE);
            doc.setLineWidth(0.4);
            doc.roundedRect(margin, y, pageW - margin * 2, 12, 2, 2, "FD");

            doc.setFontSize(9);
            doc.setFont(undefined, "bold");
            doc.setTextColor(...COLOR_BLUE);
            doc.text("Extracted by (Academic Advisor):", margin + 3, y + 5);

            doc.setFont(undefined, "normal");
            doc.setTextColor(...COLOR_DARK);
            const advisorDisplay = containsArabic(advisorName) ? reverseArabic(advisorName) : advisorName;
            doc.text(
                `${advisorDisplay}   |   ${advisorEmail}   |   ${new Date().toLocaleString()}`,
                margin + 60, y + 5
            );

            // stamp-like border on the right
            doc.setFillColor(...COLOR_BLUE);
            doc.rect(pageW - margin - 4, y, 4, 12, "F");

            y += 18;

            // ══════════════════════════════════════════════════
            // TABLE 1 – SEMESTER WORKS
            // ══════════════════════════════════════════════════
            if (semesterWorks && semesterWorks.length > 0) {
                doc.setFontSize(11);
                doc.setFont(undefined, "bold");
                doc.setTextColor(...COLOR_DARK);
                doc.text(`Current Semester Works  —  ${semester?._id || ""}`, margin, y);
                y += 2;

                const worksBody = semesterWorks.map(w => {
                    const g = typeof w.grade === "object" ? w.grade : {};
                    const total =
                        (g.midTermGrade ?? 0) +
                        (g.labGrade ?? 0) +
                        (g.practicalGrade ?? 0) +
                        (g.attendanceGrade ?? 0) +
                        (g.bonusGrade ?? 0);

                    return [
                        String(w.courseId?._id || "N/A"),
                        String(w.courseId?.courseName || "N/A"),
                        String(g.midTermGrade ?? 0),
                        String(g.labGrade ?? 0),
                        String(g.practicalGrade ?? 0),
                        String(g.attendanceGrade ?? 0),
                        String(g.bonusGrade ?? 0),
                        `${total}/50`,
                    ];
                });

                autoTable(doc, {
                    startY: y + 3,
                    head: [["Code", "Course Name", "Mid.", "Lab", "Prac.", "Att.", "Bon.", "Total"]],
                    body: worksBody,
                    headStyles: {
                        fillColor: COLOR_DARK,
                        textColor: COLOR_WHITE,
                        fontStyle: "bold",
                        fontSize: 9,
                    },
                    bodyStyles: { fontSize: 9, textColor: COLOR_DARK },
                    alternateRowStyles: { fillColor: COLOR_SUMMARY_BG },
                    columnStyles: {
                        0: { cellWidth: 24 },
                        1: { cellWidth: 60 },
                    },
                    margin: { left: margin, right: margin },
                    theme: "plain",
                    tableLineColor: [226, 232, 240],
                    tableLineWidth: 0.3,
                });

                y = doc.lastAutoTable.finalY + 10;
            }

            // ══════════════════════════════════════════════════
            // TABLE 2 – ACADEMIC HISTORY (مجمعة بالسيميستر)
            // ══════════════════════════════════════════════════
            if (y > pageH - 50) { doc.addPage(); y = 20; }

            doc.setFontSize(11);
            doc.setFont(undefined, "bold");
            doc.setTextColor(...COLOR_DARK);
            doc.text("Academic Transcript History", margin, y);
            y += 4;

            const grouped = (transcript.completedCourses || []).reduce((acc, c) => {
                const sem = c.semesterId || "Unknown";
                if (!acc[sem]) acc[sem] = [];
                acc[sem].push(c);
                return acc;
            }, {});

            const sortedSems = Object.keys(grouped).sort();

            for (const sem of sortedSems) {
                const courses = grouped[sem];

                let semTotalCr = 0, semDoneCr = 0, semWPoints = 0;
                courses.forEach(c => {
                    const cr = c.courseId?.courseCredits || 0;
                    semTotalCr += cr;
                    if (c.grade >= 60) semDoneCr += cr;
                    semWPoints += getGPAPoints(c.grade) * cr;
                });
                const semGPA = semTotalCr > 0 ? (semWPoints / semTotalCr).toFixed(2) : "0.00";

                const semBody = courses.map(c => {
                    const info = getGradeInfo(c.grade);
                    const cd = c.courseId || {};
                    return [
                        String(cd._id || "N/A"),
                        String(cd.courseName || "N/A"),
                        String(cd.courseLevel || "N/A"),
                        String(cd.courseType || "N/A"),
                        String(cd.courseCredits || 0),
                        info.status,
                        `${c.grade}  (${info.letter})`,
                        String(cd.courseRegulation || "N/A"),
                    ];
                });

                semBody.push([
                    { content: "Semester Summary", colSpan: 4, styles: { halign: "right", fontStyle: "bold", fillColor: COLOR_SUMMARY_BG, textColor: COLOR_MUTED } },
                    { content: `${semDoneCr}/${semTotalCr} Hrs`, styles: { fontStyle: "bold", fillColor: COLOR_SUMMARY_BG, textColor: COLOR_DARK } },
                    { content: `Semester GPA: ${semGPA}`, colSpan: 3, styles: { fontStyle: "bold", fillColor: COLOR_SUMMARY_BG, textColor: COLOR_BLUE } },
                ]);

                autoTable(doc, {
                    startY: y + 3,
                    head: [[
                        { content: `Semester: ${sem}`, colSpan: 8, styles: { fillColor: COLOR_LIGHT_BG, textColor: COLOR_DARK, fontStyle: "bold", fontSize: 10 } }
                    ],
                    ["Code", "Course Name", "Level", "Type", "Cr.", "Status", "Grade", "Reg."]
                    ],
                    body: semBody,
                    headStyles: {
                        fillColor: COLOR_DARK,
                        textColor: COLOR_WHITE,
                        fontStyle: "bold",
                        fontSize: 8.5,
                    },
                    didParseCell(hookData) {
                        if (hookData.section === "head" && hookData.row.index === 0) {
                            hookData.cell.styles.fillColor = COLOR_LIGHT_BG;
                            hookData.cell.styles.textColor = COLOR_DARK;
                        }
                        if (hookData.section === "body") {
                            const rowIndex = hookData.row.index;
                            const colIndex = hookData.column.index;
                            const isSummaryRow = rowIndex === courses.length;
                            if (!isSummaryRow && colIndex === 5) {
                                const status = hookData.cell.raw;
                                if (status === "Passed") {
                                    hookData.cell.styles.textColor = COLOR_GREEN;
                                    hookData.cell.styles.fontStyle = "bold";
                                } else if (status === "Failed") {
                                    hookData.cell.styles.textColor = COLOR_RED;
                                    hookData.cell.styles.fontStyle = "bold";
                                }
                            }
                        }
                    },
                    bodyStyles: { fontSize: 8.5, textColor: COLOR_DARK },
                    alternateRowStyles: { fillColor: COLOR_SUMMARY_BG },
                    columnStyles: {
                        0: { cellWidth: 22 },
                        1: { cellWidth: 52 },
                        2: { cellWidth: 18 },
                        3: { cellWidth: 30 },
                        4: { cellWidth: 10 },
                        5: { cellWidth: 16 },
                        6: { cellWidth: 20 },
                        7: { cellWidth: 16 },
                    },
                    margin: { left: margin, right: margin },
                    theme: "plain",
                    tableLineColor: [226, 232, 240],
                    tableLineWidth: 0.3,
                });

                y = doc.lastAutoTable.finalY + 8;
            }

            // ══════════════════════════════════════════════════
            // FOOTER على كل صفحة
            // ══════════════════════════════════════════════════
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);

                doc.setDrawColor(...COLOR_MUTED);
                doc.setLineWidth(0.3);
                doc.line(margin, pageH - 16, pageW - margin, pageH - 16);

                doc.setFontSize(8);
                doc.setTextColor(...COLOR_MUTED);
                doc.setFont(undefined, "normal");
                doc.text(
                    `Official Academic Transcript  •  ${department}  •  ${regulation} Regulation`,
                    margin,
                    pageH - 11
                );
                doc.text(
                    `Page ${i} of ${pageCount}`,
                    pageW - margin,
                    pageH - 11,
                    { align: "right" }
                );

                // سطر 2: Extracted by Academic Advisor
                doc.setFontSize(7.5);
                doc.setTextColor(...COLOR_BLUE);
                doc.setFont(undefined, "bold");
                doc.text("Extracted by (Advisor):", margin, pageH - 6);
                doc.setFont(undefined, "normal");
                doc.setTextColor(...COLOR_DARK);
                const footerAdvisor = containsArabic(advisorName) ? reverseArabic(advisorName) : advisorName;
                doc.text(
                    `${footerAdvisor}  (${advisorEmail})`,
                    margin + 30,
                    pageH - 6
                );
            }

            doc.save(`Official_Transcript_${studentId}.pdf`);
            swalService.success("Success", "Academic transcript exported successfully.");
        } catch (err) {
            console.error("PDF Export Error:", err);
            swalService.error("Export Failed", "Error: " + err.message);
        }
    };

    const getDisplayCredits = () => {
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
    });

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
                    <button className="back-btn-round" onClick={() => navigate(-1)}><FaArrowLeft /></button>
                    <div className="student-main-info">
                        <h2>{transcript.studentId?.studentName}</h2>
                        <div className="id-tags">
                            <span className="id-badge">ID: {transcript.studentId?._id}</span>
                            <span className="id-badge">@{transcript.studentId?.username}</span>
                            <span
                                className="id-badge"
                                onClick={handleExportPDF}
                                style={{ cursor: 'pointer', background: '#3498db', color: 'white' }}
                            >
                                <FaFileDownload /> Export PDF
                            </span>
                        </div>
                        <div className="status-container">
                            <span className={`badge ${transcript.atRisk ? 'risk' : 'safe'}`}>{transcript.atRisk ? "At Risk" : "Good Standing"}</span>
                            <span className={`badge level-${transcript.level}`}>{transcript.level}</span>
                            <span className="reg-badge">{transcript.regulation} Regulation</span>
                        </div>
                    </div>
                </div>

                <div className="academic-profile-card">
                    <div className="advisor-info-row">
                        <div className="advisor-contact-minimal" style={{ margin: '0 auto', padding: '0' }}>
                            <span><FaEnvelope /> {transcript.studentId?.studentEmail || "No Email"}</span>
                            <span><FaPhoneAlt /> {transcript.studentId?.studentPhone || "No Phone"}</span>
                        </div>
                    </div>
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

            <div>
                <div className="data-section">
                    <div className="section-title-bar">
                        <h3>Current Semester Works</h3>
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