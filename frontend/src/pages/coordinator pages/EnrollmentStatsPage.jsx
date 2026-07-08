import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import swalService from "../../services/swal";
import {
    ArrowLeft, Users, Search, Lock, Unlock, Clock,
    GraduationCap, BookOpen, AlertCircle, CheckCircle2,
    FileText, UserSquare2, Loader2, BarChart2, TrendingUp
} from "lucide-react";
import { FaArrowLeft } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    PieChart, Pie, Cell, ResponsiveContainer, RadialBarChart, RadialBar,
    LineChart, Line
} from "recharts";

import "../styles/EnrollmentStatusPage.css";

// ─── Color palette ────────────────────────────────────────────────────────────
const CHART_COLORS = {
    primary: "#2563eb",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    purple: "#8b5cf6",
    slate: "#64748b",
};
const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.warning, CHART_COLORS.success, CHART_COLORS.danger, CHART_COLORS.purple, CHART_COLORS.slate];

// ─── Status configuration (single source of truth for colors / icons / labels) ─
const STATUS_CONFIG = {
    open: { label: "Open", color: CHART_COLORS.success, bg: "#10b98120", icon: Unlock },
    closed: { label: "Closed", color: CHART_COLORS.danger, bg: "#ef444420", icon: Lock },
    proposed: { label: "Proposed", color: CHART_COLORS.warning, bg: "#f59e0b20", icon: Clock },
};
const getStatusCfg = (status) => STATUS_CONFIG[status] || { label: status || "N/A", color: "#64748b", bg: "#64748b20", icon: AlertCircle };

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomBarTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: "#1e293b", border: "1px solid #334155",
            borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 13
        }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color, margin: "2px 0" }}>
                    {p.name}: <strong>{p.value}</strong>
                </p>
            ))}
        </div>
    );
};

const CustomPieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: "#1e293b", border: "1px solid #334155",
            borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 13
        }}>
            <p style={{ fontWeight: 600 }}>{payload[0].name}</p>
            <p style={{ color: payload[0].payload.fill }}>Count: <strong>{payload[0].value}</strong></p>
        </div>
    );
};

// ─── Section header for charts ─────────────────────────────────────────────────
const SectionTitle = ({ icon: Icon, title, subtitle }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg,#2563eb22,#2563eb44)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>
            <Icon size={18} color="#2563eb" />
        </div>
        <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: "#64748b" }}>{subtitle}</div>}
        </div>
    </div>
);

// ─── Chart wrapper card ────────────────────────────────────────────────────────
const ChartCard = ({ children, style }) => (
    <div style={{
        background: "#fff",
        borderRadius: 16,
        padding: "22px 24px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 2px 12px #0f172a0a",
        minWidth: 0, 
        ...style
    }}>
        {children}
    </div>
);

// ─── Status badge (colored per status, not just open/closed) ──────────────────
const StatusBadge = ({ status }) => {
    const cfg = getStatusCfg(status);
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 20,
            fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3,
            background: cfg.bg, color: cfg.color,
        }}>
            {cfg.label.toUpperCase()}
        </span>
    );
};

// ─── Status action buttons (Open / Close / Proposed) ──────────────────────────
const StatusActions = ({ current, onChange }) => (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = current === key;
            return (
                <button
                    key={key}
                    type="button"
                    title={cfg.label}
                    disabled={active}
                    onClick={() => onChange(key)}
                    style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderRadius: 8,
                        border: `1.5px solid ${cfg.color}`,
                        background: active ? cfg.color : "#fff",
                        color: active ? "#fff" : cfg.color,
                        cursor: active ? "default" : "pointer",
                        opacity: active ? 1 : 0.9,
                        transition: "all .15s ease",
                    }}
                >
                    <Icon size={12} />
                </button>
            );
        })}
    </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const EnrollmentStatsPage = () => {
    const { semesterId } = useParams();
    const navigate = useNavigate();
    const { role } = useParams();

    const [offerings, setOfferings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [typeFilter, setTypeFilter] = useState("All");
    const [showCharts, setShowCharts] = useState(true);
    const [exporting, setExporting] = useState(false);

    // ─── Navigation ──────────────────────────────────────────────────────────
    const handleViewStudents = (courseId, offeringId, courseName, instructorId, taId) => {
        navigate(`/staff/${role}/semester/${semesterId}/course/${courseId}/${offeringId}/students`, {
            state: { courseName, instructorId, taId }
        });
    };

    // ─── Fetch ────────────────────────────────────────────────────────────────
    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/course-offerings?semesterId=${semesterId}`);
            setOfferings(res.data || []);
        } catch (err) {
            console.error("Failed to fetch stats", err);
            swalService.error("Connection Error", "Could not load enrollment data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (semesterId) fetchData(); }, [semesterId]);

    // ─── Change status (Open / Closed / Proposed) ─────────────────────────────
    const handleStatusChange = async (offeringId, newStatus) => {
        const offering = offerings.find(o => o._id === offeringId);
        if (!offering || offering.status === newStatus) return;
        const enrolledCount = offering.enrolledCount || 0;

        if (newStatus === "closed") {
            let title = "Close Course?";
            let text = "Are you sure you want to CLOSE this course? This will prevent any future enrollments.";
            if (enrolledCount > 0) {
                title = "CRITICAL WARNING";
                text = `This course has (${enrolledCount}) students enrolled. Closing it will PERMANENTLY block their registration!`;
            }
            const result = await swalService.confirm(title, text, "Yes, close it!");
            if (!result.isConfirmed) return;
        }

        if (newStatus === "proposed") {
            const result = await swalService.confirm(
                "Mark as Proposed?",
                "This will mark the course as PROPOSED",
                "Yes, mark as proposed"
            );
            if (!result.isConfirmed) return;
        }

        try {
            swalService.showLoading("Updating course status...");
            await api.put(`/course-offerings/${offeringId}/status`, { status: newStatus });
            setOfferings(prev => prev.map(off =>
                off._id === offeringId ? { ...off, status: newStatus } : off
            ));
            swalService.success("Status Updated", `Course is now ${newStatus.toUpperCase()}`);
        } catch (err) {
            console.error("Failed to update status", err);
            swalService.error("Server Error", "Failed to update course status. Please try again.");
        }
    };

    const handleCardClick = (filterName) => {
        setTypeFilter(prev => prev === filterName ? "All" : filterName);
    };

    // ─── Stats ────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total = offerings.length;
        const open = offerings.filter(o => o.status === "open").length;
        const closed = offerings.filter(o => o.status === "closed").length;
        const proposed = offerings.filter(o => o.status === "proposed").length;
        const empty = offerings.filter(o => (o.enrolledCount || 0) === 0).length;
        const withGrads = offerings.filter(o => (o.graduatingCount || 0) > 0).length;
        const suggestions = offerings.filter(o => o.status === "open" && (o.enrolledCount || 0) < 5 && (o.graduatingCount || 0) === 0).length;
        const totalStudents = offerings.reduce((sum, o) => sum + (o.enrolledCount || 0), 0);
        const totalGrads = offerings.reduce((sum, o) => sum + (o.graduatingCount || 0), 0);
        const avgEnrollment = total > 0 ? (totalStudents / total).toFixed(1) : 0;
        return { total, open, closed, proposed, empty, withGrads, suggestions, totalStudents, totalGrads, avgEnrollment };
    }, [offerings]);

    // ─── Chart data ───────────────────────────────────────────────────────────
    const chartData = useMemo(() => {
        // Top 10 courses by enrollment
        const topCourses = [...offerings]
            .sort((a, b) => (b.enrolledCount || 0) - (a.enrolledCount || 0))
            .slice(0, 10)
            .map(o => ({
                name: o.courseId?.courseName?.length > 12
                    ? o.courseId.courseName.slice(0, 12) + "…"
                    : (o.courseId?.courseName || "N/A"),
                fullName: o.courseId?.courseName || "N/A",
                Students: o.enrolledCount || 0,
                Graduating: o.graduatingCount || 0,
            }));

        // Status breakdown for pie (now includes Proposed)
        const statusPie = [
            { name: "Open", value: stats.open, fill: STATUS_CONFIG.open.color },
            { name: "Closed", value: stats.closed, fill: STATUS_CONFIG.closed.color },
            { name: "Proposed", value: stats.proposed, fill: STATUS_CONFIG.proposed.color },
        ].filter(d => d.value > 0);

        // Enrollment category breakdown
        const categoryPie = [
            { name: "Normal (5+ students)", value: offerings.filter(o => (o.enrolledCount || 0) >= 5).length, fill: CHART_COLORS.primary },
            { name: "Low Demand (<5, open)", value: stats.suggestions, fill: CHART_COLORS.warning },
            { name: "Empty (0 students)", value: stats.empty, fill: CHART_COLORS.danger },
            { name: "With Graduates", value: stats.withGrads, fill: CHART_COLORS.success },
        ].filter(d => d.value > 0);

        // Enrollment distribution histogram
        const buckets = { "0": 0, "1-5": 0, "6-10": 0, "11-20": 0, "21-30": 0, "30+": 0 };
        offerings.forEach(o => {
            const n = o.enrolledCount || 0;
            if (n === 0) buckets["0"]++;
            else if (n <= 5) buckets["1-5"]++;
            else if (n <= 10) buckets["6-10"]++;
            else if (n <= 20) buckets["11-20"]++;
            else if (n <= 30) buckets["21-30"]++;
            else buckets["30+"]++;
        });
        const distributionBar = Object.entries(buckets).map(([range, count]) => ({ range, Courses: count }));

        // Staff load
        const staffMap = {};
        offerings.forEach(o => {
            const name = o.instructorId?.staffName;
            if (!name) return;
            if (!staffMap[name]) staffMap[name] = { name, courses: 0, students: 0 };
            staffMap[name].courses++;
            staffMap[name].students += o.enrolledCount || 0;
        });
        const staffLoad = Object.values(staffMap)
            .sort((a, b) => b.students - a.students)
            .slice(0, 8);

        return { topCourses, statusPie, categoryPie, distributionBar, staffLoad };
    }, [offerings, stats]);

    // ─── Filtered table data ──────────────────────────────────────────────────
    const filteredData = useMemo(() => {
        return offerings.filter(off => {
            const courseName = off.courseId?.courseName || "";
            const courseCode = off.courseId?._id || "";
            const currentSearch = searchTerm?.toLowerCase() || "";
            const matchesSearch =
                courseName.toLowerCase().includes(currentSearch) ||
                courseCode.toLowerCase().includes(currentSearch);
            const matchesStatus = statusFilter === "All" || off.status === statusFilter;
            let matchesType = true;
            if (typeFilter === "Graduates") matchesType = (off.graduatingCount || 0) > 0;
            if (typeFilter === "Empty") matchesType = (off.enrolledCount || 0) === 0;
            if (typeFilter === "Suggestions")
                matchesType = off.status === "open" && (off.enrolledCount || 0) < 5 && (off.graduatingCount || 0) === 0;
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [offerings, searchTerm, statusFilter, typeFilter]);

    // ─── Helper: render an HTML table off-screen and rasterize it (html2canvas) ─
    // This is what fixes Arabic text turning into broken glyphs/symbols: jsPDF's
    // built-in fonts don't support Arabic Unicode shaping at all, but the real
    // browser DOM renders Arabic perfectly, so we snapshot the DOM instead of
    // asking jsPDF to draw the text itself.
    const addHtmlTableToPdf = async (doc, buildTableEl, title) => {
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const marginX = 14;
        const headerH = 18;
        const usableW = pageW - marginX * 2;
        const usableH = pageH - headerH - 10;

        const drawPageHeader = (label) => {
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 0, pageW, headerH, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(13);
            doc.setFont("helvetica", "bold");
            doc.text(label, marginX, 12);
        };

        doc.addPage("l");
        drawPageHeader(title);

        const container = document.createElement("div");
        container.style.position = "fixed";
        container.style.left = "-99999px";
        container.style.top = "0";
        container.style.width = "1600px";
        container.style.background = "#ffffff";
        container.appendChild(buildTableEl());
        document.body.appendChild(container);

        let canvas;
        try {
            canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
        } finally {
            document.body.removeChild(container);
        }

        const pxToMm = usableW / canvas.width;
        const imgHmm = canvas.height * pxToMm;

        let renderedMm = 0;
        let firstPage = true;
        while (renderedMm < imgHmm) {
            if (!firstPage) {
                doc.addPage("l");
                drawPageHeader(`${title} (cont.)`);
            }
            const sliceHmm = Math.min(usableH, imgHmm - renderedMm);
            const sliceHpx = Math.max(1, Math.round(sliceHmm / pxToMm));
            const srcYpx = Math.round(renderedMm / pxToMm);

            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHpx;
            const ctx = sliceCanvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            ctx.drawImage(canvas, 0, srcYpx, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);

            doc.addImage(sliceCanvas.toDataURL("image/png"), "PNG", marginX, headerH + 4, usableW, sliceHmm);

            renderedMm += sliceHmm;
            firstPage = false;
        }
    };

    // ─── Export PDF ───────────────────────────────────────────────────────────
    const exportToPDF = async () => {
        try {
            setExporting(true);
            const doc = new jsPDF("l", "mm", "a4"); // landscape for more room
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

            // ── Cover / Header ──────────────────────────────────────────────────
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 0, pageW, 38, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.text("Enrollment Statistics Report", 14, 16);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(148, 163, 184);
            doc.text(`Semester: ${semesterId}  |  Generated: ${now}  |  Filter: ${typeFilter}`, 14, 25);
            doc.text(`Total Offerings Shown: ${filteredData.length} / ${offerings.length}`, 14, 32);

            // ── KPI Summary Cards ───────────────────────────────────────────────
            const kpis = [
                { label: "Total Offerings", value: stats.total, color: [37, 99, 235] },
                { label: "Open Courses", value: stats.open, color: [16, 185, 129] },
                { label: "Closed Courses", value: stats.closed, color: [239, 68, 68] },
                { label: "Proposed Courses", value: stats.proposed, color: [245, 158, 11] },
                { label: "Total Students", value: stats.totalStudents, color: [37, 99, 235] },
                { label: "Empty Courses", value: stats.empty, color: [245, 158, 11] },
                { label: "Avg Enrollment", value: stats.avgEnrollment, color: [139, 92, 246] },
                { label: "Grad Critical", value: stats.withGrads, color: [16, 185, 129] },
                { label: "Suggestions", value: stats.suggestions, color: [239, 68, 68] },
            ];
            const cols = 4;
            const cardW = (pageW - 28) / cols;
            kpis.forEach((kpi, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = 14 + col * cardW;
                const y = 44 + row * 22;
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(x, y, cardW - 4, 19, 2, 2, "F");
                doc.setDrawColor(...kpi.color);
                doc.setLineWidth(0.8);
                doc.roundedRect(x, y, cardW - 4, 19, 2, 2, "S");
                doc.setFontSize(16);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...kpi.color);
                doc.text(String(kpi.value), x + 6, y + 12);
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 116, 139);
                doc.text(kpi.label, x + 6, y + 17);
            });

            const kpiRows = Math.ceil(kpis.length / cols);
            const chartY = 44 + kpiRows * 22 + 12;

            // ── Chart: Enrollment Distribution (bar via rectangles) ─────────────
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Enrollment Distribution by Range", 14, chartY);

            const distData = chartData.distributionBar;
            const maxVal = Math.max(...distData.map(d => d.Courses), 1);
            const barAreaW = 120;
            const barH = 8;
            const barStartX = 50;
            const barStartY = chartY + 6;

            distData.forEach((d, i) => {
                const y = barStartY + i * 11;
                const barW = (d.Courses / maxVal) * barAreaW;
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(71, 85, 105);
                doc.text(d.range, 14, y + 6);
                doc.setFillColor(226, 232, 240);
                doc.roundedRect(barStartX, y, barAreaW, barH, 2, 2, "F");
                if (barW > 0) {
                    doc.setFillColor(37, 99, 235);
                    doc.roundedRect(barStartX, y, barW, barH, 2, 2, "F");
                }
                doc.setTextColor(37, 99, 235);
                doc.setFont("helvetica", "bold");
                doc.text(String(d.Courses), barStartX + barAreaW + 4, y + 6);
            });

            // ── Chart: Status Breakdown (now Open / Closed / Proposed) ──────────
            const statusX = 190;
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Course Status Breakdown", statusX, chartY);

            const pieData = [
                { label: "Open", value: stats.open, color: [16, 185, 129] },
                { label: "Closed", value: stats.closed, color: [239, 68, 68] },
                { label: "Proposed", value: stats.proposed, color: [245, 158, 11] },
            ];
            pieData.forEach((seg, i) => {
                const lx = statusX;
                const ly = chartY + 8 + i * 12;
                doc.setFillColor(...seg.color);
                doc.roundedRect(lx, ly, 8, 8, 1, 1, "F");
                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...seg.color);
                doc.text(`${seg.value}`, lx + 10, ly + 6);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(71, 85, 105);
                doc.text(seg.label, lx + 20, ly + 6);
            });

            // Category breakdown
            // const catY = chartY + 8 + pieData.length * 12 + 12;
            // doc.setTextColor(15, 23, 42);
            // doc.setFontSize(11);
            // doc.setFont("helvetica", "bold");
            // doc.text("Enrollment Health Breakdown", statusX, catY);

            // const catData = [
            //     { label: "Normal (5+)", value: offerings.filter(o => (o.enrolledCount || 0) >= 5).length, color: [37, 99, 235] },
            //     { label: "Low Demand", value: stats.suggestions, color: [245, 158, 11] },
            //     { label: "Empty", value: stats.empty, color: [239, 68, 68] },
            //     { label: "With Grads", value: stats.withGrads, color: [16, 185, 129] },
            // ];
            // catData.forEach((c, i) => {
            //     const lx = statusX;
            //     const ly = catY + 8 + i * 11;
            //     doc.setFillColor(...c.color);
            //     doc.roundedRect(lx, ly, 8, 8, 1, 1, "F");
            //     doc.setFontSize(9);
            //     doc.setFont("helvetica", "bold");
            //     doc.setTextColor(...c.color);
            //     doc.text(`${c.value}`, lx + 10, ly + 6);
            //     doc.setFont("helvetica", "normal");
            //     doc.setTextColor(71, 85, 105);
            //     doc.text(c.label, lx + 22, ly + 6);
            // });

            // ── Main Data Table (rendered as real HTML -> image, so Arabic renders correctly) ─
            const statusColor = (val) => val === "OPEN" ? "#10b981" : val === "CLOSED" ? "#ef4444" : "#f59e0b";
            const hintColor = (val) => val.includes("Low") ? "#f59e0b" : val.includes("Mandatory") ? "#10b981" : "#64748b";

            const tableColumn = ["#", "Course Name", "Code", "Instructor", "TA", "Status", "Students", "Graduating", "System Hint"];
            const tableRows = [...filteredData]
                .sort((a, b) => (b.enrolledCount || 0) - (a.enrolledCount || 0))
                .map((off, idx) => [
                    idx + 1,
                    off.courseId?.courseName || "N/A",
                    off.courseId?._id || "N/A",
                    off.instructorId?.staffName || "-",
                    off.taId?.staffName || "-",
                    (off.status || "N/A").toUpperCase(),
                    off.enrolledCount || 0,
                    off.graduatingCount || 0,
                    (off.enrolledCount || 0) < 5 && off.status === "open" && (off.graduatingCount || 0) === 0
                        ? "Low Demand"
                        : (off.graduatingCount || 0) > 0
                            ? "Mandatory"
                            : "Normal",
                ]);

            await addHtmlTableToPdf(doc, () => {
                const table = document.createElement("table");
                table.style.cssText = "border-collapse:collapse;width:100%;font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:14px;";

                const colWidths = ["4%", "24%", "10%", "15%", "15%", "10%", "8%", "8%", "10%"];
                const colgroup = document.createElement("colgroup");
                colWidths.forEach(w => {
                    const col = document.createElement("col");
                    col.style.width = w;
                    colgroup.appendChild(col);
                });
                table.appendChild(colgroup);

                const thead = document.createElement("thead");
                const headRow = document.createElement("tr");
                tableColumn.forEach(label => {
                    const th = document.createElement("th");
                    th.textContent = label;
                    th.style.cssText = "background:#2563eb;color:#fff;padding:10px 8px;border:1px solid #cbd5e1;text-align:center;font-weight:700;";
                    headRow.appendChild(th);
                });
                thead.appendChild(headRow);
                table.appendChild(thead);

                const tbody = document.createElement("tbody");
                tableRows.forEach((row, i) => {
                    const tr = document.createElement("tr");
                    tr.style.background = i % 2 === 0 ? "#ffffff" : "#f8fafc";
                    row.forEach((cell, ci) => {
                        const td = document.createElement("td");
                        td.textContent = cell;
                        td.setAttribute("dir", "auto"); // lets Arabic names render RTL, English/numbers stay LTR
                        let color = "#0f172a";
                        let weight = "400";
                        if (ci === 5) { color = statusColor(cell); weight = "700"; }
                        if (ci === 8) { color = hintColor(cell); weight = "600"; }
                        td.style.cssText = `padding:7px 8px;border:1px solid #e2e8f0;text-align:center;color:${color};font-weight:${weight};`;
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                return table;
            }, "Course Offerings Detail");

            // ── Staff Load Page (also rendered as HTML -> image, instructor names may be Arabic too) ─
            if (chartData.staffLoad.length > 0) {
                await addHtmlTableToPdf(doc, () => {
                    const table = document.createElement("table");
                    table.style.cssText = "border-collapse:collapse;width:100%;font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:14px;";

                    const thead = document.createElement("thead");
                    const headRow = document.createElement("tr");
                    ["Instructor", "Courses Assigned", "Total Students", "Load Level"].forEach(label => {
                        const th = document.createElement("th");
                        th.textContent = label;
                        th.style.cssText = "background:#2563eb;color:#fff;padding:10px 8px;border:1px solid #cbd5e1;text-align:center;font-weight:700;";
                        headRow.appendChild(th);
                    });
                    thead.appendChild(headRow);
                    table.appendChild(thead);

                    const tbody = document.createElement("tbody");
                    chartData.staffLoad.forEach((s, i) => {
                        const tr = document.createElement("tr");
                        tr.style.background = i % 2 === 0 ? "#ffffff" : "#f8fafc";
                        const load = s.courses >= 4 ? "High" : s.courses >= 2 ? "Medium" : "Low";
                        [s.name, s.courses, s.students, load].forEach((cell, ci) => {
                            const td = document.createElement("td");
                            td.textContent = cell;
                            if (ci === 0) td.setAttribute("dir", "auto");
                            td.style.cssText = "padding:7px 8px;border:1px solid #e2e8f0;text-align:center;color:#0f172a;";
                            tr.appendChild(td);
                        });
                        tbody.appendChild(tr);
                    });
                    table.appendChild(tbody);
                    return table;
                }, "Instructor Load Analysis");
            }

            // ── Footer on all pages ─────────────────────────────────────────────
            const totalPages = doc.internal.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text(
                    `Page ${p} of ${totalPages}  |  Enrollment Report — Semester ${semesterId}  |  ${now}`,
                    14, pageH - 6
                );
            }

            doc.save(`Enrollment_Report_${semesterId}.pdf`);
        } catch (err) {
            console.error("Failed to export PDF", err);
            swalService.error("Export Failed", "Could not generate the PDF report. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    // ─── Loading screen ───────────────────────────────────────────────────────
    if (loading) return (
        <div className="management-container" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "80vh", flexDirection: "column", gap: 14
        }}>
            <Loader2 size={42} style={{ animation: "spin 1s linear infinite", color: "#2563eb" }} />
            <h3>Analyzing Enrollment Data...</h3>
        </div>
    );

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="management-container prereg-container">

            {/* ── Header ── */}
            <div className="prereg-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                        <button onClick={() => navigate(-1)} className="back-btn-round">
                            <FaArrowLeft />
                        </button>
                        <h2>Live Enrollment</h2>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                            className="btn-2"
                            onClick={() => setShowCharts(v => !v)}
                            style={{ display: "flex", alignItems: "center", gap: 8, background: showCharts ? "#212a39" : "#64748b" }}
                        >
                            <BarChart2 size={17} />
                            {showCharts ? "Hide Charts" : "Show Charts"}
                        </button>
                        <button className="btn-2" onClick={exportToPDF} disabled={exporting} style={{ display: "flex", alignItems: "center", gap: 8, opacity: exporting ? 0.7 : 1 }}>
                            {exporting ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <FileText size={18} />}
                            {exporting ? "Generating..." : "Export Report"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="insights-grid">
                <div className="insight-card university-stats clickable-card" onClick={() => setTypeFilter("All")}>
                    <div className="insight-header">
                        <span className="insight-icon icon-blue"><BookOpen size={18} /></span>
                        <span className="insight-label">Total Offerings</span>
                    </div>
                    <div className="insight-value-large">{stats.total}</div>
                    <div className="insight-footer">Active Semester Courses</div>
                </div>

                <div
                    className={`insight-card clickable-card ${typeFilter === "Empty" ? "active-card card-empty" : ""}`}
                    onClick={() => handleCardClick("Empty")}
                >
                    <div className="insight-header">
                        <span className="insight-icon icon-orange"><AlertCircle size={18} /></span>
                        <span className="insight-label">Empty Courses</span>
                    </div>
                    <div className="insight-value">{stats.empty}</div>
                    <div className="insight-footer">0 Students enrolled</div>
                </div>

                <div
                    className={`insight-card clickable-card ${typeFilter === "Graduates" ? "active-card card-grads" : ""}`}
                    onClick={() => handleCardClick("Graduates")}
                >
                    <div className="insight-header">
                        <span className="insight-icon icon-green"><GraduationCap size={18} /></span>
                        <span className="insight-label">Graduation Critical</span>
                    </div>
                    <div className="insight-value">{stats.withGrads}</div>
                    <div className="insight-footer">Contains seniors</div>
                </div>

                <div
                    className={`insight-card clickable-card ${typeFilter === "Suggestions" ? "active-card card-suggestions" : ""}`}
                    onClick={() => handleCardClick("Suggestions")}
                >
                    <div className="insight-header">
                        <span className="insight-icon icon-red">
                            <AlertCircle size={18} style={{ color: typeFilter === "Suggestions" ? "inherit" : "#ef4444" }} />
                        </span>
                        <span className="insight-label">Suggestions</span>
                    </div>
                    <div className="insight-value" style={{ color: typeFilter === "Suggestions" ? "inherit" : "#ef4444" }}>
                        {stats.suggestions}
                    </div>
                    <div className="insight-footer">Recommended to close</div>
                </div>
            </div>

            {/* ── Charts Section (now fully responsive via auto-fit grids) ── */}
            {showCharts && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>

                    {/* Row 1: Bar chart (top courses) + Pie (status) */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>

                        {/* Top courses by enrollment */}
                        <ChartCard style={{ flex: "2 1 480px" }}>
                            <SectionTitle
                                icon={BarChart2}
                                title="Top Courses by Enrollment"
                                subtitle="Sorted by total students registered"
                            />
                            {chartData.topCourses.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={chartData.topCourses} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                                        <Tooltip content={<CustomBarTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="Students" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Graduating" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>No data available</div>
                            )}
                        </ChartCard>

                        {/* Enrollment health pie */}
                        <ChartCard>
                            <SectionTitle
                                icon={TrendingUp}
                                title="Enrollment Health"
                                subtitle="Course category distribution"
                            />
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={chartData.categoryPie}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={52}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {chartData.categoryPie.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomPieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Legend */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                                {chartData.categoryPie.map((d, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: 3, background: d.fill, flexShrink: 0 }} />
                                        <span style={{ color: "#475569", flex: 1 }}>{d.name}</span>
                                        <strong style={{ color: d.fill }}>{d.value}</strong>
                                    </div>
                                ))}
                            </div>
                        </ChartCard>
                    </div>

                    {/* Row 2: Status pie + Distribution histogram + Staff load */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>

                        {/* Status breakdown pie (Open/Closed/Proposed) */}
                        <ChartCard>
                            <SectionTitle
                                icon={CheckCircle2}
                                title="Status Breakdown"
                                subtitle="Open vs Closed vs Proposed"
                            />
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={chartData.statusPie}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={52}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {chartData.statusPie.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomPieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                                {chartData.statusPie.map((d, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: 3, background: d.fill, flexShrink: 0 }} />
                                        <span style={{ color: "#475569", flex: 1 }}>{d.name}</span>
                                        <strong style={{ color: d.fill }}>{d.value}</strong>
                                    </div>
                                ))}
                            </div>
                        </ChartCard>

                        {/* Enrollment distribution */}
                        <ChartCard>
                            <SectionTitle
                                icon={Users}
                                title="Enrollment Distribution"
                                subtitle="Courses per student-count range"
                            />
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={chartData.distributionBar} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#64748b" }} />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                                    <Tooltip content={<CustomBarTooltip />} />
                                    <Bar dataKey="Courses" radius={[4, 4, 0, 0]}>
                                        {chartData.distributionBar.map((entry, i) => (
                                            <Cell
                                                key={i}
                                                fill={
                                                    entry.range === "0" ? CHART_COLORS.danger :
                                                        entry.range === "1-5" ? CHART_COLORS.warning :
                                                            CHART_COLORS.primary
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        {/* Staff load */}
                        <ChartCard>
                            <SectionTitle
                                icon={UserSquare2}
                                title="Instructor Load"
                                subtitle="Courses & students per instructor"
                            />
                            {chartData.staffLoad.length > 0 ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={chartData.staffLoad} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            tick={{ fontSize: 10, fill: "#64748b" }}
                                            width={90}
                                            tickFormatter={v => v.length > 12 ? v.slice(0, 12) + "…" : v}
                                        />
                                        <Tooltip content={<CustomBarTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="courses" name="Courses" fill={CHART_COLORS.purple} radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="students" name="Students" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>
                                    No instructor data available
                                </div>
                            )}
                        </ChartCard>
                    </div>
                </div>
            )}

            {/* ── Controls ── */}
            <div className="table-controls">
                <div className="search-box">
                    <Search size={20} color="#9ca3af" />
                    <input
                        type="text"
                        placeholder="Search by name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="drop-filters-group">
                    <select
                        className="filter-dropdown"
                        style={{ padding: "8px", width: 150, marginTop: 0 }}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="proposed">Proposed</option>
                    </select>
                    <select
                        className="filter-dropdown"
                        style={{ padding: "8px", width: 150, marginTop: 0 }}
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="All">All Types</option>
                        <option value="Graduates">With Graduates</option>
                        <option value="Empty">Zero Enrollment</option>
                        <option value="Suggestions">Suggestions</option>
                    </select>
                </div>
            </div>

            {/* ── Main Table ── */}
            <div className="table-wrapper">
                <table className="management-data-table">
                    <thead>
                        <tr>
                            <th>Course Details</th>
                            <th>Staff (Inst/TA)</th>
                            <th>Status</th>
                            <th>Students</th>
                            <th>Graduating</th>
                            <th>System Hint</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...filteredData]
                            .sort((a, b) => {
                                const diff = (b.enrolledCount || 0) - (a.enrolledCount || 0);
                                if (diff !== 0) return diff;
                                return (a.courseId?.courseName || "").localeCompare(b.courseId?.courseName || "");
                            })
                            .map(off => (
                                <tr key={off._id}>
                                    <td
                                        className="fetchCourse clickable-cell"
                                        onClick={() => handleViewStudents(
                                            off.courseId?._id, off._id,
                                            off.courseId?.courseName,
                                            off.instructorId?.staffName,
                                            off.taId?.staffName
                                        )}
                                    >
                                        <div className="c-name">{off.courseId?.courseName || "Unknown Course"}</div>
                                        <div className="c-id">{off.courseId?._id || off.courseId}</div>
                                    </td>
                                    <td style={{ fontSize: "0.85rem", lineHeight: 1.4 }}>
                                        <div style={{ color: "#3b82f6", fontWeight: 500 }}>I: {off.instructorId?.staffName || "-"}</div>
                                        <div style={{ color: "#6b7280" }}>T: {off.taId?.staffName || "-"}</div>
                                    </td>
                                    <td>
                                        <StatusBadge status={off.status} />
                                    </td>
                                    <td>{off.enrolledCount || 0}</td>
                                    <td className="text-center">
                                        <span className={(off.graduatingCount || 0) > 0 ? "g-critical" : "g-normal"}>
                                            {off.graduatingCount || 0}
                                        </span>
                                    </td>
                                    <td>
                                        {(off.enrolledCount || 0) < 5 && off.status === "open" && (off.graduatingCount || 0) === 0 ? (
                                            <span className="h-low-demand"><AlertCircle size={14} /> Low Demand</span>
                                        ) : (off.graduatingCount || 0) > 0 ? (
                                            <span className="h-mandatory"><CheckCircle2 size={14} /> Mandatory</span>
                                        ) : (
                                            <span className="h-normal">Normal</span>
                                        )}
                                    </td>
                                    <td className="text-center">
                                        <StatusActions
                                            current={off.status}
                                            onChange={(newStatus) => handleStatusChange(off._id, newStatus)}
                                        />
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
                {filteredData.length === 0 && (
                    <div className="table-no-data">No courses found matching your criteria.</div>
                )}
            </div>

            {/* ── Students Modal (kept as-is) ── */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Students Enrolled in: {selectedCourse}</h3>
                            <button className="close-modal" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {loadingStudents ? (
                                <div className="loader">Loading students list...</div>
                            ) : students.length > 0 ? (
                                <div className="table-wrapper">
                                    <table className="students-list-table">
                                        <thead>
                                            <tr>
                                                <th>Student ID</th>
                                                <th>Student Name</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map(item => (
                                                <tr key={item.studentId?._id}>
                                                    <td>{item.studentId?._id}</td>
                                                    <td>{item.studentId?.studentName}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="no-data">No students enrolled in this course yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnrollmentStatsPage;