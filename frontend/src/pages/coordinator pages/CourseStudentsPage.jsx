import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import swalService from "../../services/swal";
import {
    ArrowLeft, Search, Users, Eye, UserPlus, X,
    GraduationCap, Filter, FileText, Layout, Info,
    UserCheck, Loader2, BarChart2, TrendingUp, Award
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, ResponsiveContainer, Legend
} from "recharts";
import { arabicTextToImageData, containsArabic } from "../../services/Transcriptutils";
import "../styles/StudentDetails.css";

// ─── Color palette ─────────────────────────────────────────────────────────────
const COLORS = {
    primary: "#2563eb",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    purple: "#8b5cf6",
    pink: "#ec4899",
    slate: "#64748b",
};

const LEVEL_COLOR = {
    freshman: "#3b82f6",
    sophomore: "#8b5cf6",
    junior: "#f59e0b",
    senior: "#10b981",
    "senior-1": "#06b6d4",
    "senior-2": "#14b8a6",
    graduated: "#6b7280",
};

// ─── Custom tooltip ────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: "#1e293b", border: "1px solid #334155",
            borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 12
        }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color, margin: "2px 0" }}>
                    {p.name}: <strong>{p.value}</strong>
                </p>
            ))}
        </div>
    );
};

// ─── Chart card ────────────────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, icon: Icon, children }) => (
    <div style={{
        background: "#fff", borderRadius: 14, padding: "20px 22px",
        border: "1px solid #e2e8f0", boxShadow: "0 2px 12px #0f172a0a"
    }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: "linear-gradient(135deg,#2563eb22,#2563eb44)",
                display: "flex", alignItems: "center", justifyContent: "center"
            }}>
                <Icon size={17} color="#2563eb" />
            </div>
            <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{title}</div>
                {subtitle && <div style={{ fontSize: 11, color: "#64748b" }}>{subtitle}</div>}
            </div>
        </div>
        {children}
    </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const CourseStudentsPage = () => {
    const { semesterId, courseId, offeringId, role } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const courseName = location.state?.courseName || "Course Students";

    const [currentInstructor, setCurrentInstructor] = useState(location.state?.instructorId || null);
    const [currentTA, setCurrentTA] = useState(location.state?.taId || null);

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLevel, setSelectedLevel] = useState("All");
    const [selectedRegulation, setSelectedRegulation] = useState("All");
    const [showCharts, setShowCharts] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState("instructor");
    const [lecturers, setLecturers] = useState([]);
    const [tas, setTas] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState("");
    const [assigning, setAssigning] = useState(false);

    const levels = ["freshman", "sophomore", "junior", "senior", "senior-1", "senior-2", "graduated"];
    const regulations = ["last", "New"];

    // ─── Fetch ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/semester-work/course/${courseId}`);
                setStudents(res.data || []);

                const staffRes = await api.get("/staff");
                setLecturers(staffRes.data.filter(s => s.roles.includes("lecturer")));
                setTas(staffRes.data.filter(s => s.roles.includes("ta")));
            } catch (err) {
                console.error("Error fetching data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [courseId]);

    // ─── Filtered students ───────────────────────────────────────────────────────
    const filteredStudents = useMemo(() => {
        return students.filter(item => {
            const matchesSearch =
                item.studentId?.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.studentId?._id?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLevel = selectedLevel === "All" || item.studentId?.transcript?.level === selectedLevel;
            const matchesReg = selectedRegulation === "All" || item.studentId?.transcript?.regulation === selectedRegulation;
            return matchesSearch && matchesLevel && matchesReg;
        });
    }, [students, searchTerm, selectedLevel, selectedRegulation]);

    // ─── Stats ───────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total = filteredStudents.length;
        const newReg = filteredStudents.filter(s => s.studentId?.transcript?.regulation === "New").length;
        const oldReg = filteredStudents.filter(s => s.studentId?.transcript?.regulation === "last").length;

        const levelBreakdown = {};
        filteredStudents.forEach(s => {
            const lv = s.studentId?.transcript?.level || "Unknown";
            levelBreakdown[lv] = (levelBreakdown[lv] || 0) + 1;
        });

        const gradeFields = ["midTermGrade", "attendanceGrade", "labGrade", "practicalGrade", "bonusGrade", "finalGrade", "totalGrade"];
        const gradeAverages = {};
        gradeFields.forEach(field => {
            const vals = filteredStudents
                .map(s => s.grade?.[field])
                .filter(v => v !== undefined && v !== null && v !== "N/A");
            gradeAverages[field] = vals.length > 0
                ? (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1)
                : "N/A";
        });

        const graded = filteredStudents.filter(s => s.grade?.totalGrade !== undefined && s.grade?.totalGrade !== null);
        const passed = graded.filter(s => Number(s.grade.totalGrade) >= 60).length;
        const failed = graded.filter(s => Number(s.grade.totalGrade) < 60).length;

        return { total, newReg, oldReg, levelBreakdown, gradeAverages, passed, failed, graded: graded.length };
    }, [filteredStudents]);

    // ─── Chart data ───────────────────────────────────────────────────────────────
    const chartData = useMemo(() => {
        const levelPie = Object.entries(stats.levelBreakdown).map(([level, count]) => ({
            name: level.charAt(0).toUpperCase() + level.slice(1),
            value: count,
            fill: LEVEL_COLOR[level] || COLORS.slate,
        }));

        const gradeBar = [
            { name: "Mid Exam", avg: parseFloat(stats.gradeAverages.midTermGrade) || 0 },
            { name: "Attend.", avg: parseFloat(stats.gradeAverages.attendanceGrade) || 0 },
            { name: "Lab", avg: parseFloat(stats.gradeAverages.labGrade) || 0 },
            { name: "Practical", avg: parseFloat(stats.gradeAverages.practicalGrade) || 0 },
            { name: "Bonus", avg: parseFloat(stats.gradeAverages.bonusGrade) || 0 },
            { name: "Final", avg: parseFloat(stats.gradeAverages.finalGrade) || 0 },
        ].filter(d => !isNaN(d.avg));

        const regPie = [
            { name: "New Regulation", value: stats.newReg, fill: COLORS.primary },
            { name: "Last Regulation", value: stats.oldReg, fill: COLORS.pink },
        ].filter(d => d.value > 0);

        const passPie = [
            { name: "Passed (≥60)", value: stats.passed, fill: COLORS.success },
            { name: "Failed (<60)", value: stats.failed, fill: COLORS.danger },
            { name: "Not Graded", value: stats.total - stats.graded, fill: COLORS.slate },
        ].filter(d => d.value > 0);

        return { levelPie, gradeBar, regPie, passPie };
    }, [stats]);

    // ─── Assign handlers ────────────────────────────────────────────────────────
    const handleAssignInstructor = async () => {
        if (!selectedStaff) return swalService.error("Wait!", "Please select a lecturer");
        setAssigning(true);
        try {
            await api.post(`/course-offerings/${offeringId}/assign-instructor`, { instructorId: selectedStaff });
            const staff = lecturers.find(l => l._id === selectedStaff);
            if (staff) setCurrentInstructor(staff.staffName);
            swalService.success("Success", "Instructor assigned successfully!");
            setIsModalOpen(false);
        } catch (err) {
            swalService.error("Failed", "Failed to assign instructor.");
        } finally {
            setAssigning(false);
        }
    };

    const handleAssignTA = async () => {
        if (!selectedStaff) return swalService.error("Wait!", "Please select a TA");
        setAssigning(true);
        try {
            await api.post(`/course-offerings/${offeringId}/assign-ta`, { taId: selectedStaff });
            const staff = tas.find(t => t._id === selectedStaff);
            if (staff) setCurrentTA(staff.staffName);
            swalService.success("Success", "TA assigned successfully!");
            setIsModalOpen(false);
        } catch (err) {
            swalService.error("Failed", "Failed to assign TA.");
        } finally {
            setAssigning(false);
        }
    };

    const openModal = (type) => {
        setModalType(type);
        setSelectedStaff("");
        setIsModalOpen(true);
    };

    // ─── Export PDF ───────────────────────────────────────────────────────────────
    const exportToPDF = () => {
        const doc = new jsPDF("l", "mm", "a4");
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

        // ── Cover header ──────────────────────────────────────────────────────
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, pageW, 40, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(`Course Report: ${courseName}`, 14, 14);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text(`Course ID: ${courseId}  |  Semester: ${semesterId}  |  Generated: ${now}`, 14, 22);
        doc.text(
            `Instructor: ${currentInstructor || "Not Assigned"}  |  TA: ${currentTA || "Not Assigned"}`,
            14, 29
        );
        doc.text(
            `Filters Applied — Level: ${selectedLevel}  |  Regulation: ${selectedRegulation}  |  Total shown: ${filteredStudents.length}`,
            14, 36
        );

        // ── KPI summary cards ─────────────────────────────────────────────────
        const kpis = [
            { label: "Total Students", value: stats.total, color: [37, 99, 235] },
            { label: "New Regulation", value: stats.newReg, color: [139, 92, 246] },
            { label: "Last Regulation", value: stats.oldReg, color: [236, 72, 153] },
            { label: "Passed (≥60)", value: stats.passed, color: [16, 185, 129] },
            { label: "Failed (<60)", value: stats.failed, color: [239, 68, 68] },
            { label: "Avg Mid Exam", value: stats.gradeAverages.midTermGrade, color: [245, 158, 11] },
            { label: "Avg Final", value: stats.gradeAverages.finalGrade, color: [37, 99, 235] },
            { label: "Avg Total", value: stats.gradeAverages.totalGrade, color: [16, 185, 129] },
        ];

        const cardW = (pageW - 28) / 4;
        kpis.forEach((kpi, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const x = 14 + col * cardW;
            const y = 46 + row * 22;
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(x, y, cardW - 4, 19, 2, 2, "F");
            doc.setDrawColor(...kpi.color);
            doc.setLineWidth(0.8);
            doc.roundedRect(x, y, cardW - 4, 19, 2, 2, "S");
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...kpi.color);
            doc.text(String(kpi.value), x + 5, y + 12);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 116, 139);
            doc.text(kpi.label, x + 5, y + 17);
        });

        // ── Grade averages visual bar ─────────────────────────────────────────
        const gradeY = 96;
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Average Grade Components", 14, gradeY);

        const gradeItems = [
            { label: "Mid Exam", val: stats.gradeAverages.midTermGrade, max: 30, color: [37, 99, 235] },
            { label: "Attend.", val: stats.gradeAverages.attendanceGrade, max: 10, color: [139, 92, 246] },
            { label: "Lab", val: stats.gradeAverages.labGrade, max: 10, color: [245, 158, 11] },
            { label: "Practical", val: stats.gradeAverages.practicalGrade, max: 10, color: [16, 185, 129] },
            { label: "Bonus", val: stats.gradeAverages.bonusGrade, max: 10, color: [236, 72, 153] },
            { label: "Final", val: stats.gradeAverages.finalGrade, max: 60, color: [239, 68, 68] },
            { label: "Total", val: stats.gradeAverages.totalGrade, max: 100, color: [30, 41, 59] },
        ];

        const barAreaW = 100;
        const barStartX = 46;
        gradeItems.forEach((g, i) => {
            const y = gradeY + 6 + i * 10;
            const num = parseFloat(g.val);
            const barW = isNaN(num) ? 0 : Math.min((num / g.max) * barAreaW, barAreaW);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105);
            doc.text(g.label, 14, y + 6);
            doc.setFillColor(226, 232, 240);
            doc.roundedRect(barStartX, y, barAreaW, 7, 1.5, 1.5, "F");
            if (barW > 0) {
                doc.setFillColor(...g.color);
                doc.roundedRect(barStartX, y, barW, 7, 1.5, 1.5, "F");
            }
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...g.color);
            doc.text(isNaN(num) ? "N/A" : `${num} / ${g.max}`, barStartX + barAreaW + 4, y + 6);
        });

        // ── Level breakdown ───────────────────────────────────────────────────
        const lvX = 180;
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Level Distribution", lvX, gradeY);

        const lvColors = {
            freshman: [59, 130, 246],
            sophomore: [139, 92, 246],
            junior: [245, 158, 11],
            senior: [16, 185, 129],
            "senior-1": [6, 182, 212],
            "senior-2": [20, 184, 166],
            graduated: [107, 114, 128],
        };
        Object.entries(stats.levelBreakdown).forEach(([lv, cnt], i) => {
            const ly = gradeY + 8 + i * 11;
            const col = lvColors[lv] || [100, 116, 139];
            doc.setFillColor(...col);
            doc.roundedRect(lvX, ly, 8, 8, 1, 1, "F");
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...col);
            doc.text(`${cnt}`, lvX + 10, ly + 6);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105);
            doc.text(lv.charAt(0).toUpperCase() + lv.slice(1), lvX + 20, ly + 6);
        });

        // ── Regulation breakdown ──────────────────────────────────────────────
        const regY = gradeY + 8 + Object.keys(stats.levelBreakdown).length * 11 + 6;
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Regulation Split", lvX, regY);
        [
            { label: "New", value: stats.newReg, col: [37, 99, 235] },
            { label: "Last", value: stats.oldReg, col: [236, 72, 153] },
        ].forEach((r, i) => {
            const ry = regY + 6 + i * 10;
            doc.setFillColor(...r.col);
            doc.roundedRect(lvX, ry, 8, 8, 1, 1, "F");
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...r.col);
            doc.text(`${r.value}`, lvX + 10, ry + 6);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105);
            doc.text(r.label, lvX + 22, ry + 6);
        });

        // ── Page 2: Full student table ────────────────────────────────────────
        doc.addPage("l");
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, pageW, 18, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(`Student Grade Sheet — ${courseName}`, 14, 12);

        const cols = ["#", "Student ID", "Student Name", "Level", "Reg.", "Mid", "Attend.", "Lab", "Pract.", "Bonus", "Final", "Total", "Status"];

        // ── بنبني الـ rows مع معالجة الأسماء العربية ──
        const rows = filteredStudents.map((s, idx) => {
            const total = s.grade?.totalGrade;
            const status = total === undefined || total === null
                ? "Not graded"
                : Number(total) >= 50 ? "Pass" : "Fail";

            const rawName = s.studentId?.studentName || "N/A";
            const nameCell = containsArabic(rawName)
                ? {
                    content: " ",
                    _arabicImg: arabicTextToImageData(rawName, 8, "#1e293b"),
                }
                : rawName;

            return [
                idx + 1,
                s.studentId?._id || "N/A",
                nameCell,
                s.studentId?.transcript?.level || "N/A",
                s.studentId?.transcript?.regulation || "N/A",
                s.grade?.midTermGrade ?? "—",
                s.grade?.attendanceGrade ?? "—",
                s.grade?.labGrade ?? "—",
                s.grade?.practicalGrade ?? "—",
                s.grade?.bonusGrade ?? "—",
                s.grade?.finalGrade ?? "—",
                s.grade?.totalGrade ?? "—",
                status,
            ];
        });

        autoTable(doc, {
            startY: 24,
            head: [cols],
            body: rows,
            theme: "grid",
            headStyles: { fillColor: [37, 99, 235], halign: "center", fontSize: 8, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { halign: "center", cellWidth: 8 },
                1: { cellWidth: 22 },
                2: { cellWidth: 50 },
                3: { cellWidth: 20 },
                4: { halign: "center", cellWidth: 14 },
                5: { halign: "center", cellWidth: 14 },
                6: { halign: "center", cellWidth: 16 },
                7: { halign: "center", cellWidth: 14 },
                8: { halign: "center", cellWidth: 16 },
                9: { halign: "center", cellWidth: 14 },
                10: { halign: "center", cellWidth: 14 },
                11: { halign: "center", cellWidth: 14 },
                12: { halign: "center", cellWidth: 18 },
            },
            styles: { fontSize: 7.5, cellPadding: 2.5 },

            // ── رسم الأسماء العربية كـ images ──
            didDrawCell(hookData) {
                if (hookData.section !== "body") return;
                const cell = hookData.cell;
                if (!cell.raw?._arabicImg) return;

                const { dataUrl, widthMm, heightMm } = cell.raw._arabicImg;
                const cellH = cell.height;
                const imgH = Math.min(cellH - 1, 4.5);
                const scale = imgH / (heightMm || 1);
                const imgW = Math.min(widthMm * scale, cell.width - 2);
                const imgX = cell.x + cell.width - imgW - 1; // محاذاة يمين
                const imgY = cell.y + (cellH - imgH) / 2;
                doc.addImage(dataUrl, "PNG", imgX, imgY, imgW, imgH);
            },

            didParseCell(hookData) {
                // نخفي الـ placeholder text للخلايا العربية
                if (hookData.section === "body" && hookData.cell.raw?._arabicImg) {
                    hookData.cell.styles.textColor = [255, 255, 255, 0];
                }

                // Pass / Fail coloring
                if (hookData.section === "body" && hookData.column.index === 12) {
                    const v = hookData.cell.raw;
                    if (v === "Pass") {
                        hookData.cell.styles.textColor = [16, 185, 129];
                        hookData.cell.styles.fontStyle = "bold";
                    } else if (v === "Fail") {
                        hookData.cell.styles.textColor = [239, 68, 68];
                        hookData.cell.styles.fontStyle = "bold";
                    }
                }
            },
        });

        // ── Footer on all pages ───────────────────────────────────────────────
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(
                `Page ${p} of ${totalPages}  |  ${courseName} (${courseId})  |  Semester ${semesterId}  |  ${now}`,
                14, pageH - 5
            );
        }

        doc.save(`${courseName}_Report_${semesterId}.pdf`);
    };

    // ─── Loading ──────────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="management-container" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "80vh", flexDirection: "column", gap: 14
        }}>
            <Loader2 size={42} style={{ animation: "spin 1s linear infinite", color: "#2563eb" }} />
            <h3>Fetching Students List...</h3>
        </div>
    );

    // ─── Render ───────────────────────────────────────────────────────────────────
    return (
        <div className="management-container student-details-wrapper">

            {/* ── Header ── */}
            <div className="details-header">
                <div className="header-left">
                    <button className="back-btn-round" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className="student-main-info">
                        <h2 style={{ fontSize: "1.5rem" }}>{courseName}</h2>
                        <div className="id-tags">
                            <span className="id-badge">Course ID: {courseId}</span>
                            <span className="id-badge">Semester: {semesterId}</span>
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                        className="btn-2"
                        onClick={() => setShowCharts(v => !v)}
                        style={{ display: "flex", alignItems: "center", gap: 8, background: showCharts ? "#212a39" : "#64748b" }}
                    >
                        <BarChart2 size={16} />
                        {showCharts ? "Hide Charts" : "Show Charts"}
                    </button>
                    <button className="btn-2" onClick={exportToPDF} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <FileText size={18} />
                        Export Report
                    </button>
                    <button className="btn-1" onClick={() => openModal("instructor")} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <UserPlus size={18} />
                        Assign Lecturer
                    </button>
                    <button className="btn-1" onClick={() => openModal("ta")} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <GraduationCap size={18} />
                        Assign TA
                    </button>
                </div>
            </div>

            {/* ── Staff overview ── */}
            <div className="staff-assignment-overview" style={{
                display: "flex", justifyContent: "space-around", marginTop: 15,
                padding: 10, border: "2px dashed #e5e7eb", borderRadius: 12, backgroundColor: "#fcfcfd"
            }}>
                <div style={{ display: "flex", width: "50%", alignItems: "center", gap: 10, padding: "5px 15px", borderRight: "1px solid #e5e7eb" }}>
                    <UserCheck size={18} color="#3a86ff" />
                    <div>
                        <span style={{ fontSize: "0.7rem", color: "#6b7280", display: "block", textTransform: "uppercase" }}>Course Instructor</span>
                        <span style={{ fontWeight: 600, color: "#111827" }}>{currentInstructor || "Not Assigned"}</span>
                    </div>
                </div>
                <div style={{ display: "flex", width: "50%", alignItems: "center", gap: 10, padding: "5px 15px" }}>
                    <Users size={18} color="#06d6a0" />
                    <div>
                        <span style={{ fontSize: "0.7rem", color: "#6b7280", display: "block", textTransform: "uppercase" }}>Teaching Assistant</span>
                        <span style={{ fontWeight: 600, color: "#111827" }}>{currentTA || "Not Assigned"}</span>
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="insight-cards-grid" style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 20, marginTop: 20
            }}>
                <div className="insight-card">
                    <div className="advisor-info-row">
                        <div className="insight-icon icon-blue"><Users size={22} /></div>
                        <div className="stat-info">
                            <h6 className="label" style={{ fontSize: "0.75rem", marginBottom: 5 }}>Total (Filtered)</h6>
                            <p className="insight-value">{stats.total} Students</p>
                        </div>
                    </div>
                </div>
                <div className="insight-card">
                    <div className="advisor-info-row">
                        <div className="insight-icon" style={{ backgroundColor: "rgba(251,86,7,.1)", color: "#fb5607" }}>
                            <Layout size={22} />
                        </div>
                        <div className="stat-info">
                            <h6 className="label" style={{ fontSize: "0.75rem", marginBottom: 5 }}>New Regulation</h6>
                            <p className="insight-value">{stats.newReg}</p>
                        </div>
                    </div>
                </div>
                <div className="insight-card">
                    <div className="advisor-info-row">
                        <div className="insight-icon" style={{ backgroundColor: "rgba(255,0,110,.1)", color: "#ff006e" }}>
                            <Info size={22} />
                        </div>
                        <div className="stat-info">
                            <h6 className="label" style={{ fontSize: "0.75rem", marginBottom: 5 }}>Last Regulation</h6>
                            <p className="insight-value">{stats.oldReg}</p>
                        </div>
                    </div>
                </div>
                <div className="insight-card">
                    <div className="advisor-info-row">
                        <div className="insight-icon" style={{ backgroundColor: "rgba(16,185,129,.1)", color: "#10b981" }}>
                            <Award size={22} />
                        </div>
                        <div className="stat-info">
                            <h6 className="label" style={{ fontSize: "0.75rem", marginBottom: 5 }}>Avg Total Grade</h6>
                            <p className="insight-value">{stats.gradeAverages.totalGrade}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Charts ── */}
            {showCharts && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 24 }}>

                    {/* Row 1: Grade averages + Level pie */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>

                        <ChartCard title="Grade Component Averages" subtitle="Average per grade type across filtered students" icon={BarChart2}>
                            {chartData.gradeBar.length > 0 ? (
                                <ResponsiveContainer width="100%" height={230}>
                                    <BarChart data={chartData.gradeBar} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                                        <Tooltip content={<DarkTooltip />} />
                                        <Bar dataKey="avg" name="Average" radius={[4, 4, 0, 0]}>
                                            {chartData.gradeBar.map((_, i) => (
                                                <Cell key={i} fill={Object.values(COLORS)[i % Object.values(COLORS).length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>No grade data yet</div>
                            )}
                        </ChartCard>

                        <ChartCard title="Level Distribution" subtitle="Students per academic level" icon={TrendingUp}>
                            {chartData.levelPie.length > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <PieChart>
                                            <Pie data={chartData.levelPie} cx="50%" cy="50%"
                                                innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                                                {chartData.levelPie.map((e, i) => (
                                                    <Cell key={i} fill={e.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={({ active, payload }) => {
                                                if (!active || !payload?.length) return null;
                                                return (
                                                    <div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", fontSize: 12 }}>
                                                        <strong>{payload[0].name}</strong>: {payload[0].value}
                                                    </div>
                                                );
                                            }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                        {chartData.levelPie.map((d, i) => (
                                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                                                <div style={{ width: 10, height: 10, borderRadius: 3, background: d.fill, flexShrink: 0 }} />
                                                <span style={{ color: "#475569", flex: 1 }}>{d.name}</span>
                                                <strong style={{ color: d.fill }}>{d.value}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>No level data</div>
                            )}
                        </ChartCard>
                    </div>

                    {/* Row 2: Regulation split + Pass/Fail */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                        <ChartCard title="Regulation Split" subtitle="New vs Last regulation breakdown" icon={Layout}>
                            {chartData.regPie.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={chartData.regPie} cx="50%" cy="50%"
                                            outerRadius={75} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                            {chartData.regPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                        </Pie>
                                        <Tooltip content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            return (
                                                <div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", fontSize: 12 }}>
                                                    <strong>{payload[0].name}</strong>: {payload[0].value}
                                                </div>
                                            );
                                        }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>No regulation data</div>
                            )}
                        </ChartCard>

                        <ChartCard title="Pass / Fail Distribution" subtitle="Based on total grade ≥ 50" icon={Award}>
                            {chartData.passPie.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={chartData.passPie} cx="50%" cy="50%"
                                            outerRadius={75} paddingAngle={4} dataKey="value"
                                            label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}>
                                            {chartData.passPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                        </Pie>
                                        <Tooltip content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            return (
                                                <div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", fontSize: 12 }}>
                                                    <strong>{payload[0].name}</strong>: {payload[0].value}
                                                </div>
                                            );
                                        }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>No grade data yet</div>
                            )}
                        </ChartCard>
                    </div>
                </div>
            )}

            {/* ── Table + Filters ── */}
            <div className="data-section" style={{ marginTop: 30 }}>
                <div className="table-controls">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="drop-filters-group">
                        <select className="filter-dropdown"
                            style={{ padding: 8, width: 150, marginTop: 0 }}
                            value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
                            <option value="All">All Levels</option>
                            {levels.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div className="drop-filters-group">
                        <select className="filter-dropdown"
                            style={{ padding: 8, width: 150, marginTop: 0 }}
                            value={selectedRegulation} onChange={(e) => setSelectedRegulation(e.target.value)}>
                            <option value="All">All Regs</option>
                            {regulations.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Student Name</th>
                                <th>Level</th>
                                <th>Regulation</th>
                                <th>Mid. Exam</th>
                                <th>Attend.</th>
                                <th>Lab.</th>
                                <th>Pract.</th>
                                <th>Bonus</th>
                                <th>Final</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map(item => (
                                    <tr
                                        key={item.studentId?._id}
                                        onClick={() => navigate(`/staff/${role}/students/${item.studentId?._id}`)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <td className="bold">#{item.studentId?._id}</td>
                                        <td>{item.studentId?.studentName}</td>
                                        <td>
                                            <span className={`status-badge ${item.studentId?.transcript?.level}`}>
                                                {item.studentId?.transcript?.level}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="id-badge" style={{ backgroundColor: "#f3f4f6", color: "#374151" }}>
                                                {item.studentId?.transcript?.regulation}
                                            </span>
                                        </td>
                                        <td>{item.grade?.midTermGrade ?? "N/A"}</td>
                                        <td>{item.grade?.attendanceGrade ?? "N/A"}</td>
                                        <td>{item.grade?.labGrade ?? "N/A"}</td>
                                        <td>{item.grade?.practicalGrade ?? "N/A"}</td>
                                        <td>{item.grade?.bonusGrade ?? "N/A"}</td>
                                        <td>{item.grade?.finalGrade ?? "N/A"}</td>
                                        <td>{item.grade?.totalGrade ?? "N/A"}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="11" className="empty-msg">No students found matching current filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Assign Modal ── */}
            {isModalOpen && (
                <div className="modal-overlay" style={{
                    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                    backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
                    justifyContent: "center", alignItems: "center", zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: "#fff", borderRadius: 12, width: 450,
                        padding: 0, overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,.1)"
                    }}>
                        <div className="modal-header" style={{
                            padding: 20, borderBottom: "1px solid #eee", display: "flex",
                            justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9fafb"
                        }}>
                            <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#111827" }}>
                                {modalType === "instructor" ? "Assign Instructor" : "Assign TA"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#667085" }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ padding: 25 }}>
                            <label style={{ display: "block", marginBottom: 8, fontWeight: 500, color: "#374151" }}>
                                Select {modalType === "instructor" ? "Lecturer" : "Teaching Assistant"}:
                            </label>
                            <select
                                value={selectedStaff}
                                onChange={(e) => setSelectedStaff(e.target.value)}
                                className="modal-select"
                                style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: "1rem" }}
                            >
                                <option value="">-- Choose {modalType === "instructor" ? "a Lecturer" : "a TA"} --</option>
                                {(modalType === "instructor" ? lecturers : tas).map(staff => (
                                    <option key={staff._id} value={staff._id}>
                                        {staff.staffName} ({staff._id})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="modal-footer" style={{
                            padding: "15px 25px", backgroundColor: "#f9fafb", borderTop: "1px solid #eee",
                            display: "flex", justifyContent: "flex-end", gap: 10
                        }}>
                            <button className="cancel-btn" onClick={() => setIsModalOpen(false)} style={{
                                padding: "10px 20px", borderRadius: 6, border: "1px solid #d1d5db",
                                backgroundColor: "#fff", cursor: "pointer"
                            }}>
                                Cancel
                            </button>
                            <button
                                className="btn-1"
                                onClick={modalType === "instructor" ? handleAssignInstructor : handleAssignTA}
                                disabled={assigning}
                            >
                                {assigning ? "Assigning..." : "Confirm Assignment"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseStudentsPage;