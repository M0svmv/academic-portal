import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Users, Search, Eye, PlusCircle,
    BarChart3, AlertTriangle, Loader2,
    UserMinus, FileDown, BarChart2, TrendingUp, UserSquare2
} from "lucide-react";
import {
    PieChart, Pie, Cell, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    ResponsiveContainer
} from "recharts";
import api from "../../services/api";
import "./styles/AdviseStudents.css";

// ─── PDF helpers ───────────────────────────────────────────────────────────────
const loadScript = (src) =>
    new Promise((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) return res();
        const s = document.createElement("script");
        s.src = src; s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
    });

const captureChart = async (el) => {
    const { default: html2canvas } = await import(
        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js"
    );
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
    return canvas.toDataURL("image/png");
};

const containsArabic = (str) => /[\u0600-\u06FF]/.test(str);

// ─── Chart UI helpers ──────────────────────────────────────────────────────────
const SectionTitle = ({ icon: Icon, title, subtitle }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg,#2563eb22,#2563eb44)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0
        }}>
            <Icon size={18} color="#2563eb" />
        </div>
        <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: "#64748b" }}>{subtitle}</div>}
        </div>
    </div>
);


const ChartCard = ({ children, style }) => (
    <div style={{
        background: "#fff",
        borderRadius: 16,
        padding: "22px 24px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 2px 12px #0f172a0a",
        minWidth: 0,
        width: "100%",
        boxSizing: "border-box",
        ...style
    }}>
        {children}
    </div>
);

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

// ─── Main Component ────────────────────────────────────────────────────────────
const AdviseStudents = () => {
    const navigate = useNavigate();
    const { role } = useParams();

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterLevel, setFilterLevel] = useState("All");
    const [filterReg, setFilterReg] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [exportLoading, setExportLoading] = useState(false);
    const [showCharts, setShowCharts] = useState(true);

    // Refs for hidden chart clones used by html2canvas
    const pieChartRef = useRef(null);
    const barChartRef = useRef(null);

    useEffect(() => { fetchAdvisingList(); }, []);

    const fetchAdvisingList = async () => {
        try {
            setLoading(true);
            const res = await api.get("/academic-advisors/me/list");
            const advising = res.data[0];
            const mapped = advising.students.map((s) => ({
                id: s.student._id,
                name: s.student.studentName,
                GPA: s.student.transcript.GPA,
                regulation: s.student.transcript.regulation,
                level: s.student.transcript.level,
                atRisk: s.student.transcript.atRisk,
                alerts: s.student.transcript.alerts,
                registeredCredits: s.student.enrollment.currentEnrolledCredits,
                allowedCredits: s.student.enrollment.allowedCredits,
            }));
            setStudents(mapped);
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    // ─── Stats ─────────────────────────────────────────────────────────────────
    const stats = useMemo(() => ({
        total: students.length,
        atRisk: students.filter((s) => s.atRisk).length,
        unregistered: students.filter((s) => s.registeredCredits === 0).length,
        good: students.filter((s) => !s.atRisk).length,
        avgGPA: (students.reduce((acc, s) => acc + s.GPA, 0) / (students.length || 1)).toFixed(2),
    }), [students]);

    // ─── Chart data ────────────────────────────────────────────────────────────
    const pieData = useMemo(() => [
        { name: "Good Standing", value: stats.good, fill: "#16a34a" },
        { name: "At Risk", value: stats.atRisk, fill: "#dc2626" },
        { name: "Unregistered", value: stats.unregistered, fill: "#f59e0b" },
    ].filter((d) => d.value > 0), [stats]);

    const gpaRanges = useMemo(() => [
        { range: "0 – 1", count: students.filter((s) => s.GPA < 1).length },
        { range: "1 – 2", count: students.filter((s) => s.GPA >= 1 && s.GPA < 2).length },
        { range: "2 – 3", count: students.filter((s) => s.GPA >= 2 && s.GPA < 3).length },
        { range: "3 – 4", count: students.filter((s) => s.GPA >= 3).length },
    ], [students]);

    const levelData = useMemo(() => {
        const levels = ["Freshman", "Sophomore", "Junior", "senior-1", "senior-2", "Senior"];
        return levels
            .map((l) => ({ level: l, count: students.filter((s) => s.level === l).length }))
            .filter((d) => d.count > 0);
    }, [students]);

    // ─── Filtered table ────────────────────────────────────────────────────────
    const filteredStudents = useMemo(() => students.filter((s) => {
        const matchesSearch =
            s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLevel = filterLevel === "All" || s.level === filterLevel;
        const matchesReg = filterReg === "All" || s.regulation === filterReg;
        let matchesStatus = true;
        if (filterStatus === "atRisk") matchesStatus = s.atRisk;
        else if (filterStatus === "good") matchesStatus = !s.atRisk;
        else if (filterStatus === "unregistered") matchesStatus = s.registeredCredits === 0;
        return matchesSearch && matchesLevel && matchesReg && matchesStatus;
    }), [students, searchTerm, filterLevel, filterReg, filterStatus]);

    // ─── Card active style ─────────────────────────────────────────────────────
    const getCardStyle = (cardStatus) =>
        filterStatus === cardStatus
            ? { cursor: "pointer", border: "2px solid #2563eb", backgroundColor: "#f8fafc", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", transform: "translateY(-2px)" }
            : { cursor: "pointer", border: "2px solid transparent" };

    // ─── PDF Export ────────────────────────────────────────────────────────────
    const handleExportPDF = async () => {
        setExportLoading(true);
        try {
            await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

            const [pieImg, barImg] = await Promise.all([
                captureChart(pieChartRef.current),
                captureChart(barChartRef.current),
            ]);

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 14;
            const contentW = pageW - margin * 2;
            let y = margin;

            const now = new Date().toLocaleString("en-US");

            // ── Header ──
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 0, pageW, 30, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(17);
            doc.setFont("helvetica", "bold");
            doc.text("Student Advising Management Report", pageW / 2, 13, { align: "center" });
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(148, 163, 184);
            doc.text(`Generated: ${now}   |   Total Students: ${stats.total}`, pageW / 2, 22, { align: "center" });
            y = 38;

            // ── KPI Cards ──
            const kpis = [
                { label: "Total Students", value: stats.total, color: [37, 99, 235] },
                { label: "Unregistered", value: stats.unregistered, color: [220, 38, 38] },
                { label: "At Risk", value: stats.atRisk, color: [234, 88, 12] },
                { label: "Avg. GPA", value: stats.avgGPA, color: [22, 163, 74] },
            ];
            const cardW = (contentW - 9) / 4;
            kpis.forEach((k, i) => {
                const cx = margin + i * (cardW + 3);
                doc.setFillColor(...k.color);
                doc.roundedRect(cx, y, cardW, 20, 2, 2, "F");
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(7);
                doc.setFont("helvetica", "normal");
                doc.text(k.label, cx + cardW / 2, y + 7, { align: "center" });
                doc.setFontSize(15);
                doc.setFont("helvetica", "bold");
                doc.text(String(k.value), cx + cardW / 2, y + 16, { align: "center" });
            });
            y += 28;

            // ── Charts ──
            const chartH = 60;
            const halfW = (contentW - 4) / 2;

            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, y, halfW, chartH + 8, 2, 2);
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("Student Status Distribution", margin + halfW / 2, y + 5.5, { align: "center" });
            doc.addImage(pieImg, "PNG", margin + 2, y + 8, halfW - 4, chartH);

            const bx = margin + halfW + 4;
            doc.roundedRect(bx, y, halfW, chartH + 8, 2, 2);
            doc.text("GPA Distribution", bx + halfW / 2, y + 5.5, { align: "center" });
            doc.addImage(barImg, "PNG", bx + 2, y + 8, halfW - 4, chartH);
            y += chartH + 18;

            // ── Table heading ──
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            doc.text("Student Details", margin, y);
            y += 6;

            // ── Table header row ──
            const cols = [
                { label: "ID", w: 20 },
                { label: "Name", w: 54 },
                { label: "GPA", w: 14 },
                { label: "Status", w: 20 },
                { label: "Regulation", w: 22 },
                { label: "Level", w: 24 },
                { label: "Credits", w: 20 },
                { label: "Alerts", w: 14 },
            ];
            doc.setFillColor(30, 41, 59);
            doc.rect(margin, y, contentW, 8, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            let cx2 = margin + 2;
            cols.forEach((col) => { doc.text(col.label, cx2, y + 5.5); cx2 += col.w; });
            y += 8;

            // ── Table rows ──
            doc.setFont("helvetica", "normal");
            students.forEach((s, idx) => {
                if (y > pageH - 20) { doc.addPage(); y = margin; }

                // row bg
                if (s.atRisk) doc.setFillColor(254, 242, 242);
                else if (idx % 2 === 0) doc.setFillColor(248, 250, 252);
                else doc.setFillColor(255, 255, 255);
                doc.rect(margin, y, contentW, 7, "F");

                doc.setFontSize(6.5);
                const rowData = [
                    `#${s.id.slice(-6)}`,
                    s.name,
                    String(s.GPA),
                    s.atRisk ? "At Risk" : "Good",
                    s.regulation || "–",
                    s.level || "–",
                    `${s.registeredCredits}/${s.allowedCredits}`,
                    s.alerts > 0 ? String(s.alerts) : "–",
                ];

                let rx = margin + 2;
                rowData.forEach((val, ci) => {
                    const col = cols[ci];
                    if (ci === 3) doc.setTextColor(s.atRisk ? 220 : 22, s.atRisk ? 38 : 163, s.atRisk ? 38 : 74);
                    else if (ci === 0) doc.setTextColor(100, 116, 139);
                    else doc.setTextColor(30, 41, 59);

                    if (containsArabic(val)) {
                        doc.text(val, rx + col.w - 2, y + 4.8, { align: "right" });
                    } else {
                        const max = Math.floor(col.w / 1.8);
                        const display = val.length > max ? val.slice(0, max - 1) + "…" : val;
                        doc.text(display, rx, y + 4.8);
                    }
                    rx += col.w;
                });

                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.2);
                doc.line(margin, y + 7, margin + contentW, y + 7);
                y += 7;
            });

            // ── Footer ──
            const totalPages = doc.internal.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text(
                    `Academic Advising System  •  Page ${p} of ${totalPages}  •  ${now}`,
                    pageW / 2, pageH - 6, { align: "center" }
                );
            }

            doc.save(`Advising_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err) {
            console.error("PDF Export Error:", err);
            alert("Failed to export PDF. Please try again.");
        } finally {
            setExportLoading(false);
        }
    };

    // ─── Loading ───────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="management-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", flexDirection: "column", gap: 14 }}>
            <Loader2 size={42} style={{ animation: "spin 1s linear infinite", color: "#2563eb" }} />
            <h3>Loading Students...</h3>
        </div>
    );

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="management-container adv-page">

            {/* ── Hidden chart clones for PDF capture ── */}
            <div style={{ position: "fixed", top: "-9999px", left: "-9999px", pointerEvents: "none", zIndex: -1 }}>
                <div ref={pieChartRef} style={{ width: 340, height: 230, background: "#fff", padding: 8 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={78} dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false} fontSize={10}>
                                {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Pie>
                            <Tooltip /><Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div ref={barChartRef} style={{ width: 340, height: 230, background: "#fff", padding: 8 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={gpaRanges} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="count" name="Students" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Header ── */}
            <header className="meeting-header">
                <div className="management-header meeting-header">
                    <div className="prereg-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: 10 }}>
                        <h2>Student Advising Management</h2>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button
                                className="btn-2"
                                onClick={() => setShowCharts((v) => !v)}
                                style={{ display: "flex", alignItems: "center", gap: 8, background: showCharts ? "#1e293b" : "#64748b" }}
                            >
                                <BarChart2 size={16} />
                                {showCharts ? "Hide Charts" : "Show Charts"}
                            </button>
                            <button
                                className="btn-2"
                                onClick={handleExportPDF}
                                disabled={exportLoading || students.length === 0}
                                style={{ display: "flex", alignItems: "center", gap: 8, opacity: exportLoading ? 0.7 : 1, cursor: exportLoading ? "not-allowed" : "pointer" }}
                            >
                                {exportLoading
                                    ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                    : <FileDown size={16} />}
                                {exportLoading ? "Generating..." : "Export PDF"}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── KPI Cards ── */}
            <div
                className="insights-grid"
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}
            >
                <div className={`insight-card clickable ${filterStatus === "All" ? "active-card" : ""}`} onClick={() => setFilterStatus("All")} style={getCardStyle("All")}>
                    <div className="insight-header"><span className="insight-icon icon-blue"><Users size={18} /></span><span className="insight-label">Total Students</span></div>
                    <div className="insight-value">{stats.total}</div>
                </div>
                <div className={`insight-card clickable ${filterStatus === "unregistered" ? "active-card" : ""}`} onClick={() => setFilterStatus("unregistered")} style={getCardStyle("unregistered")}>
                    <div className="insight-header"><span className="insight-icon icon-red"><UserMinus size={18} color="#dc2626" /></span><span className="insight-label">Unregistered</span></div>
                    <div className="insight-value">{stats.unregistered}</div>
                </div>
                <div className={`insight-card clickable ${filterStatus === "atRisk" ? "active-card" : ""}`} onClick={() => setFilterStatus("atRisk")} style={getCardStyle("atRisk")}>
                    <div className="insight-header"><span className="insight-icon icon-orange"><AlertTriangle size={18} /></span><span className="insight-label">At Risk</span></div>
                    <div className="insight-value">{stats.atRisk}</div>
                </div>
                <div className="insight-card">
                    <div className="insight-header"><span className="insight-icon icon-green"><BarChart3 size={18} /></span><span className="insight-label">Avg. GPA</span></div>
                    <div className="insight-value">{stats.avgGPA}</div>
                </div>
            </div>

            {/* ── Charts Section ── */}
            {showCharts && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>

                    {/* Row 1: Pie + GPA Bar — auto-fit wraps to a single column on narrow screens */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: 20
                    }}>
                        <ChartCard>
                            <SectionTitle icon={TrendingUp} title="Student Status Distribution" subtitle="At Risk vs Good Standing vs Unregistered" />
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="45%"
                                        outerRadius="70%"
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Manual legend below the chart instead of Recharts <Legend />,
                                which was overlapping the pie on narrow containers */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                                {pieData.map((d, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: 3, background: d.fill, flexShrink: 0 }} />
                                        <span style={{ color: "#475569", flex: 1 }}>{d.name}</span>
                                        <strong style={{ color: d.fill }}>{d.value}</strong>
                                    </div>
                                ))}
                            </div>
                        </ChartCard>

                        <ChartCard>
                            <SectionTitle icon={BarChart2} title="GPA Distribution" subtitle="Number of students per GPA range" />
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={gpaRanges} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="range" tick={{ fontSize: 12, fill: "#64748b" }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                                    <Tooltip content={<CustomBarTooltip />} />
                                    <Bar dataKey="count" name="Students" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>

                    {/* Row 2: Level distribution */}
                    {levelData.length > 0 && (
                        <ChartCard>
                            <SectionTitle icon={UserSquare2} title="Students by Academic Level" subtitle="Headcount per level" />
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={levelData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="level" tick={{ fontSize: 12, fill: "#64748b" }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                                    <Tooltip content={<CustomBarTooltip />} />
                                    <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                                        {levelData.map((_, i) => (
                                            <Cell key={i} fill={["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"][i % 6]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    )}
                </div>
            )}

            {/* ── Filters ── */}
            <div className="adv-controls" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "stretch" }}>
                <div className="adv-search-wrapper" style={{ flex: "1 1 220px", minWidth: 180 }}>
                    <Search className="adv-search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search Student..."
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: "100%", boxSizing: "border-box" }}
                    />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, flex: "2 1 320px" }}>
                    <select
                        className="adv-filter-select"
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(e.target.value)}
                        style={{ flex: "1 1 130px", minWidth: 120 }}
                    >
                        <option value="All">All Levels</option>
                        {["Freshman", "Sophomore", "Junior", "senior-1", "senior-2", "Senior"].map((l) => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                    <select
                        className="adv-filter-select"
                        value={filterReg}
                        onChange={(e) => setFilterReg(e.target.value)}
                        style={{ flex: "1 1 130px", minWidth: 120 }}
                    >
                        <option value="All">All Regulations</option>
                        <option value="New">New</option>
                        <option value="Last">Last</option>
                    </select>
                    <select
                        className="adv-filter-select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ flex: "1 1 130px", minWidth: 120 }}
                    >
                        <option value="All">Status</option>
                        <option value="atRisk">At Risk</option>
                        <option value="good">Good Standing</option>
                        <option value="unregistered">Unregistered</option>
                    </select>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="table-wrapper" style={{ overflowX: "auto", width: "100%" }}>
                <table className="adv-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th style={{ textAlign: "center" }}>GPA</th>
                            <th>Regulation</th>
                            <th>Level</th>
                            <th>Credits</th>
                            <th>Alerts</th>
                            <th style={{ textAlign: "center" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((s) => (
                                <tr key={s.id} className={s.atRisk ? "row-at-risk" : ""}>
                                    <td className="adv-student-id">#{s.id}</td>
                                    <td>{s.name}</td>
                                    <td style={{ textAlign: "center" }}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                            <span style={{ fontWeight: 600 }}>{s.GPA}</span>
                                            {s.atRisk
                                                ? <div className="type-badge" style={{ backgroundColor: "#fee2e2", color: "#dc2626", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: "bold" }}>At Risk</div>
                                                : <div className="type-badge" style={{ backgroundColor: "#f0fdf4", color: "#16a34a", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: "bold" }}>Good</div>}
                                        </div>
                                    </td>
                                    <td><span className={`badge-reg reg-${s.regulation?.toLowerCase() === "new" ? "new" : "last"}`}>{s.regulation}</span></td>
                                    <td><span className={`badge-level level-${s.level?.toLowerCase()}`}>{s.level}</span></td>
                                    <td>
                                        <span style={{ color: s.registeredCredits === 0 ? "#dc2626" : "inherit", fontWeight: s.registeredCredits === 0 ? 600 : "normal" }}>
                                            {s.registeredCredits}
                                        </span>{" "}/ {s.allowedCredits}
                                    </td>
                                    <td>{s.alerts > 0 ? s.alerts : "No Alerts"}</td>
                                    <td className="adv-actions">
                                        <button onClick={() => navigate(`/staff/${role}/student/${s.id}`)} title="View Profile">
                                            <Eye size={18} color="#3a86ff" />
                                        </button>
                                        <button onClick={() => navigate(`/staff/${role}/advisor/enroll/${s.id}`)} title="Enroll Student">
                                            <PlusCircle size={18} color="#10b981" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                                    No students found matching the selected criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdviseStudents;