import React, { useState, useEffect } from 'react';
import {
    ClipboardList, Search, Filter, Eye, User, Calendar, Clock,
    CheckCircle2, AlertCircle, ArrowUpCircle, ArrowDownCircle,
    RotateCcw, XCircle, FileText, LayoutDashboard, X, MessageSquare, Loader2
} from 'lucide-react';
import api from '../../services/api';
import swalService from "../../services/swal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─────────────────────────────────────────────────────────────────────────────
// Arabic-safe PDF helper
// ─────────────────────────────────────────────────────────────────────────────
const arabicTextToImage = (text, { fontSize = 13, color = "#1e293b", maxWidth = 400 } = {}) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const dpr = 2;
    const font = `${fontSize * dpr}px "Segoe UI", "Noto Sans Arabic", Arial, sans-serif`;

    ctx.font = font;

    const words = text.split(" ");
    const lines = [];
    let line = "";
    words.forEach(word => {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth * dpr && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    });
    if (line) lines.push(line);

    const lineH = fontSize * dpr * 1.5;
    canvas.width = maxWidth * dpr;
    canvas.height = lines.length * lineH + 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.direction = "rtl";
    ctx.textAlign = "right";

    lines.forEach((ln, i) => {
        ctx.fillText(ln, canvas.width - 4, (i + 1) * lineH - fontSize * dpr * 0.3);
    });

    return {
        dataUrl: canvas.toDataURL("image/png"),
        widthMm: maxWidth,
        heightMm: (canvas.height / dpr) * 0.264583,
    };
};

const hasArabic = (str = "") => /[\u0600-\u06FF]/.test(str);

const drawMixedText = (doc, text, x, y, { fontSize = 10, color = [30, 41, 59], maxWidthMm = 160 } = {}) => {
    if (!text) return y;
    const str = String(text);
    if (hasArabic(str)) {
        const img = arabicTextToImage(str, {
            fontSize: fontSize + 1,
            color: `rgb(${color.join(",")})`,
            maxWidth: maxWidthMm / 0.264583,
        });
        doc.addImage(img.dataUrl, "PNG", x, y - fontSize * 0.4, img.widthMm, img.heightMm);
        return y + img.heightMm + 1;
    } else {
        doc.setFontSize(fontSize);
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(str, maxWidthMm);
        doc.text(lines, x, y);
        return y + lines.length * (fontSize * 0.4);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-request PDF export  (no emoji — colored dot accent instead)
// ─────────────────────────────────────────────────────────────────────────────
const exportRequestPDF = (req) => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const margin = 14;

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageW, 38, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Academic Request Report", margin, 14);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${now}`, margin, 22);
    doc.text(`Request ID: ${req._id}`, margin, 29);

    // Status pill (top-right)
    const statusColors = {
        pending: [245, 158, 11],
        approved: [16, 185, 129],
        rejected: [239, 68, 68],
    };
    const sColor = statusColors[req.status] || [100, 116, 139];
    doc.setFillColor(...sColor);
    doc.roundedRect(pageW - 50, 10, 36, 12, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text((req.status || "").toUpperCase(), pageW - 32, 18, { align: "center" });

    // ── Helpers ─────────────────────────────────────────────────────────────
    let y = 48;

    // Section title — colored filled-circle accent + bold text, NO emoji
    const SECTION_COLORS = {
        "Student Information": [59, 130, 246],   // blue
        "Request Details": [99, 102, 241],   // indigo
        "Student Justification": [245, 158, 11],   // amber
        "Academic Advisor": [16, 185, 129],   // emerald
    };

    const sectionTitle = (title) => {
        const accentColor = SECTION_COLORS[title] || [59, 130, 246];

        // light tinted background bar
        doc.setFillColor(240, 245, 255);
        doc.roundedRect(margin, y, pageW - margin * 2, 9, 2, 2, "F");

        // colored accent dot
        doc.setFillColor(...accentColor);
        doc.circle(margin + 5, y + 4.5, 2.2, "F");

        // title text
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...accentColor);
        doc.text(title, margin + 10, y + 6.5);

        y += 14;
    };

    const fieldLabel = (label) => {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(label, margin, y);
        y += 4;
    };

    const fieldValue = (value, opts = {}) => {
        const newY = drawMixedText(doc, value || "N/A", margin, y, {
            fontSize: 10,
            color: opts.color || [30, 41, 59],
            maxWidthMm: pageW - margin * 2,
        });
        y = newY + 5;
    };

    // Two-column layout — fixed row tracking
    const twoCol = (items) => {
        const colW = (pageW - margin * 2) / 2;
        // Render pairs row by row
        for (let r = 0; r < items.length; r += 2) {
            const rowItems = items.slice(r, r + 2);
            const rowStartY = y;
            let rowMaxY = rowStartY;

            rowItems.forEach((item, col) => {
                const cx = margin + col * colW;
                let cy = rowStartY;

                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 116, 139);
                doc.text(item.label, cx, cy);
                cy += 4;

                const endY = drawMixedText(doc, item.value || "N/A", cx, cy, {
                    fontSize: 10,
                    color: item.color || [30, 41, 59],
                    maxWidthMm: colW - 6,
                });
                rowMaxY = Math.max(rowMaxY, endY + 3);
            });

            y = rowMaxY + 4;
        }
    };

    const divider = () => {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(margin, y, pageW - margin, y);
        y += 6;
    };

    // ── 1. Student Info ─────────────────────────────────────────────────────
    sectionTitle("Student Information");
    twoCol([
        { label: "Student Name", value: req.studentId?.studentName },
        { label: "Student ID", value: req.studentId?._id },
        {
            label: "Semester",
            value: req.semesterId?.name || req.semesterId,
        },
        {
            label: "Submitted On",
            value: new Date(req.createdAt).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
            }),
        },
    ]);
    divider();

    // ── 2. Request Details ──────────────────────────────────────────────────
    sectionTitle("Request Details");
    twoCol([
        { label: "Request Type", value: req.requestType },
        { label: "Status", value: (req.status || "").toUpperCase(), color: sColor },
    ]);

    if (req.requestType === "Withdrawal" || req.requestType === "improve Grade") {
        fieldLabel("Target Course");
        const cname = req.courseId?.courseName || req.courseId || "N/A";
        const cid = req.courseId?._id ? ` (${req.courseId._id})` : "";
        fieldValue(cname + cid, { color: [37, 99, 235] });
    }

    if (req.requestType === "Add Drop" || req.requestType === "Overload") {
        fieldLabel("Added Courses");
        if (req.addedCourses?.length > 0) {
            req.addedCourses.forEach(c => {
                fieldValue(`+ ${c.courseName || c}${c._id ? ` (${c._id})` : ""}`, { color: [16, 185, 129] });
            });
        } else {
            fieldValue("None");
        }

        fieldLabel("Dropped Courses");
        if (req.droppedCourses?.length > 0) {
            req.droppedCourses.forEach(c => {
                fieldValue(`- ${c.courseName || c}${c._id ? ` (${c._id})` : ""}`, { color: [239, 68, 68] });
            });
        } else {
            fieldValue("None");
        }
    }

    divider();

    // ── 3. Student Justification ────────────────────────────────────────────
    sectionTitle("Student Justification");

    const reason = req.writtenReason || req.studentSuggestion || "No explanation provided.";
    const boxStartY = y;

    // Measure text height first
    const tempEndY = drawMixedText(doc, `"${reason}"`, margin + 4, y + 4, {
        fontSize: 10,
        color: [30, 41, 59],
        maxWidthMm: pageW - margin * 2 - 8,
    });
    const actualBoxH = Math.max(tempEndY - boxStartY + 4, 18);

    // Draw box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, boxStartY, pageW - margin * 2, actualBoxH, 3, 3, "FD");

    // Draw text on top
    drawMixedText(doc, `"${reason}"`, margin + 4, boxStartY + 4, {
        fontSize: 10,
        color: [30, 41, 59],
        maxWidthMm: pageW - margin * 2 - 8,
    });

    y = boxStartY + actualBoxH + 8;

    if (req.withdrawalReason) {
        fieldLabel("Withdrawal Category");
        fieldValue(req.withdrawalReason);
    }

    divider();

    // ── 4. Academic Advisor ─────────────────────────────────────────────────
    sectionTitle("Academic Advisor");
    twoCol([
        { label: "Advisor Name", value: req.academicAdvisorId?.staffName || "Not Assigned" },
        { label: "Advisor ID", value: req.academicAdvisorId?._id || "—" },
    ]);

    fieldLabel("Advisor Comment");
    const comment = req.academicAdvisorComment || "No comment from advisor yet.";
    const commentStartY = y;

    const tempCommentEndY = drawMixedText(doc, comment, margin + 4, y + 4, {
        fontSize: 10,
        color: [30, 64, 175],
        maxWidthMm: pageW - margin * 2 - 8,
    });
    const commentBoxH = Math.max(tempCommentEndY - commentStartY + 4, 14);

    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(186, 230, 253);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, commentStartY, pageW - margin * 2, commentBoxH, 3, 3, "FD");

    drawMixedText(doc, comment, margin + 4, commentStartY + 4, {
        fontSize: 10,
        color: [30, 64, 175],
        maxWidthMm: pageW - margin * 2 - 8,
    });

    y = commentStartY + commentBoxH + 6;

    // ── Footer ──────────────────────────────────────────────────────────────
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
        `Academic Request Report  |  ${now}  |  Page 1 of 1`,
        pageW / 2, pageH - 6, { align: "center" }
    );

    const studentName = req.studentId?.studentName || "student";
    const safeName = studentName.replace(/[^\w\s\u0600-\u06FF]/g, "").trim().replace(/\s+/g, "_");
    doc.save(`Request_${req.requestType}_${safeName}.pdf`);
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
const RequestSummaryView = ({ request }) => {
    const courseName = request.courseId?._id || request.courseId || "Multiple Courses";
    switch (request.requestType) {
        case 'Add Drop':
            return (
                <div style={{ fontSize: '14px', display: 'flex', gap: '5px' }}>
                    <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                        <ArrowUpCircle size={16} /> Added: {request.addedCourses?.length || 0}
                    </div>
                    <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                        <ArrowDownCircle size={16} /> Dropped: {request.droppedCourses?.length || 0}
                    </div>
                </div>
            );
        case 'Withdrawal':
            return <div style={{ fontSize: '14px', color: '#ef4444', fontWeight: '500' }}>Withdraw: {courseName}</div>;
        case 'improve Grade':
            return <div style={{ fontSize: '14px', color: '#6366f1', fontWeight: '500' }}>Improve: {courseName}</div>;
        case 'Overload':
            return <div style={{ fontSize: '14px', color: '#f59e0b', fontWeight: '500' }}>{request.addedCourses?.length || 0} Overload</div>;
        default:
            return <span>{courseName}</span>;
    }
};

const StatusBadge = ({ status }) => {
    const map = {
        pending: { bg: '#fff7ed', text: '#c2410c', icon: <Clock size={12} /> },
        approved: { bg: '#f0fdf4', text: '#15803d', icon: <CheckCircle2 size={12} /> },
        rejected: { bg: '#fef2f2', text: '#b91c1c', icon: <XCircle size={12} /> },
    };
    const config = map[status] || map.pending;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px', borderRadius: '12px', fontSize: '11px',
            fontWeight: '700', backgroundColor: config.bg, color: config.text,
            textTransform: 'uppercase'
        }}>
            {config.icon} {status}
        </span>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const CoordinatorAcademicRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('');
    const [viewingRequest, setViewingRequest] = useState(null);

    const fetchAllRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get("/academic-requests/all");
            setRequests(res.data.Requests || []);
        } catch (err) {
            console.error('Error fetching coordinator requests:', err);
            swalService.error("Failed to load requests data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAllRequests(); }, []);

    const filteredRequests = requests.filter(req => {
        const studentName = req.studentId?.studentName?.toLowerCase() || '';
        const advisorName = req.academicAdvisorId?.staffName?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();
        const matchesSearch = studentName.includes(term) || advisorName.includes(term);
        const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
        const matchesType = typeFilter === '' || req.requestType === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    };

    const styles = {
        tableCell: { padding: '16px', fontSize: '14px', borderBottom: '1px solid #f1f5f9' },
    };

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="prereg-header">
                    <h2>Academic Requests</h2>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="insights-grid">
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-blue"><LayoutDashboard size={18} /></span>
                        <span className="insight-label">Total Volume</span>
                    </div>
                    <div className="insight-value">{stats.total}</div>
                </div>
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-orange"><Clock size={18} /></span>
                        <span className="insight-label">Under Review</span>
                    </div>
                    <div className="insight-value">{stats.pending}</div>
                </div>
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-green"><CheckCircle2 size={18} /></span>
                        <span className="insight-label">Finalized</span>
                    </div>
                    <div className="insight-value">{stats.approved}</div>
                </div>
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-purple"><AlertCircle size={18} /></span>
                        <span className="insight-label">Dismissed</span>
                    </div>
                    <div className="insight-value">{stats.rejected}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-wrapper">
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        className="search-input"
                        type="text"
                        placeholder="Search student or advisor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="filter-select">
                        <option value="">All Types</option>
                        <option value="Withdrawal">Withdrawal</option>
                        <option value="Add Drop">Add Drop</option>
                        <option value="improve Grade">Improve Grade</option>
                        <option value="Overload">Overload</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Student Info</th>
                            <th>Type</th>
                            <th>Course / Action</th>
                            <th>Advisor</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                    <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#2563eb', marginBottom: 8 }} />
                                    <div>Fetching academic records...</div>
                                </td>
                            </tr>
                        ) : filteredRequests.length > 0 ? (
                            [...filteredRequests]
                                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                .map(req => (
                                    <tr key={req._id} className="table-row-hover">
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ fontWeight: '600', color: '#1e293b' }}>
                                                {req.studentId?.studentName || "N/A"}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                ID: {req.studentId?._id || req.studentId?.id || "N/A"}
                                            </div>
                                        </td>
                                        <td style={styles.tableCell}>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                                                fontWeight: '600', backgroundColor: '#f1f5f9', color: '#475569'
                                            }}>{req.requestType}</span>
                                        </td>
                                        <td><RequestSummaryView request={req} /></td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    width: '24px', height: '24px', borderRadius: '50%',
                                                    backgroundColor: '#e2e8f0', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <User size={12} />
                                                </div>
                                                <span style={{ fontSize: '13px' }}>
                                                    {req.academicAdvisorId?.staffName || "Unassigned"}
                                                </span>
                                            </div>
                                        </td>
                                        <td><StatusBadge status={req.status} /></td>
                                        <td>
                                            <div className="action-btns" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                <button
                                                    className="btn-icon btn-view"
                                                    title="View Details"
                                                    onClick={() => setViewingRequest(req)}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    className="btn-icon"
                                                    title="Export PDF"
                                                    onClick={() => exportRequestPDF(req)}
                                                    style={{
                                                        background: 'none',
                                                        borderRadius: '8px', padding: '6px 8px',
                                                        cursor: 'pointer', color: '#64748b',
                                                        display: 'flex', alignItems: 'center',
                                                        transition: 'all .15s'
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#2563eb'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                                                >
                                                    <FileText size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>
                                    <FileText size={48} style={{ marginBottom: '12px', opacity: 0.2 }} />
                                    <p>No academic requests match your filters.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Details Drawer ── */}
            {viewingRequest && (
                <div className="details-drawer-overlay" onClick={() => setViewingRequest(null)}>
                    <div className="details-drawer" onClick={(e) => e.stopPropagation()}>

                        <div className="drawer-header">
                            <div className="drawer-title-area">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span className={`badge-type status-${viewingRequest.status.toLowerCase()}`}>
                                        {viewingRequest.status}
                                    </span>
                                    <button
                                        onClick={() => exportRequestPDF(viewingRequest)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                                            background: '#f8fafc', cursor: 'pointer', fontSize: 13,
                                            color: '#2563eb', fontWeight: 600
                                        }}
                                    >
                                        <FileText size={15} /> Export PDF
                                    </button>
                                </div>
                                <h3>Academic Request Details</h3>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

                                <button className="close-drawer-btn" onClick={() => setViewingRequest(null)}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="drawer-content">
                            <div className="detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div className="detail-group">
                                    <label>Student Info</label>
                                    <div className="student-detail-chip">
                                        <div className="std-info">
                                            <span className="std-name">{viewingRequest.studentId?.studentName}</span>
                                            <span className="std-id">ID: {viewingRequest.studentId?._id}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="detail-row-grid">
                                    <div className="detail-group">
                                        <label>Request Type</label>
                                        <p className="detail-value title">{viewingRequest.requestType}</p>
                                    </div>
                                    <div className="detail-group">
                                        <label>Submission Date</label>
                                        <p className="detail-value">
                                            {new Date(viewingRequest.createdAt).toLocaleDateString()}
                                        </p>
                                        <span className="sub-id" style={{ fontSize: '11px', color: '#94a3b8' }}>
                                            Semester: {viewingRequest.semesterId?.name || "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <hr className="drawer-divider" />

                            <div className="specific-details">
                                {(viewingRequest.requestType === "Withdrawal" || viewingRequest.requestType === "improve Grade") && (
                                    <div className="detail-group">
                                        <label>Target Course</label>
                                        <p className="detail-value highlight">
                                            {viewingRequest.courseId?.courseName || viewingRequest.courseId || "N/A"}
                                            {viewingRequest.courseId?._id && (
                                                <span className="sub-id"> ({viewingRequest.courseId._id})</span>
                                            )}
                                        </p>
                                    </div>
                                )}
                                {(viewingRequest.requestType === "Add Drop" || viewingRequest.requestType === "Overload") && (
                                    <div className="detail-row">
                                        <div className="detail-group">
                                            <label>Added Courses</label>
                                            <div className="course-chips detail-value-green">
                                                {viewingRequest.addedCourses?.length > 0 ? (
                                                    viewingRequest.addedCourses.map(c => (
                                                        <span key={c._id || c} className="chip add">
                                                            {c.courseName || c} - {c._id ? `${c._id}` : ''}
                                                        </span>
                                                    ))
                                                ) : <p className="detail-value-muted">None</p>}
                                            </div>
                                        </div>
                                        <div className="detail-group" style={{ marginTop: '15px' }}>
                                            <label>Dropped Courses</label>
                                            <div className="course-chips detail-value-green">
                                                {viewingRequest.droppedCourses?.length > 0 ? (
                                                    viewingRequest.droppedCourses.map(c => (
                                                        <span key={c._id || c} className="chip drop">
                                                            {c.courseName || c} - {c._id ? `${c._id}` : ''}
                                                        </span>
                                                    ))
                                                ) : <p className="detail-value-muted">None</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <hr className="drawer-divider" />

                            <div className="detail-group" style={{ marginBottom: '12px' }}>
                                <label>Student Justification</label>
                                <div style={{
                                    backgroundColor: '#f8fafc', padding: '15px',
                                    borderRadius: '10px', border: '1px solid #e2e8f0'
                                }}>
                                    <p style={{ margin: 0, color: '#1e293b', fontStyle: 'italic', fontSize: '14px' }}>
                                        "{viewingRequest.writtenReason || viewingRequest.studentSuggestion || "No explanation provided."}"
                                    </p>
                                    {viewingRequest.withdrawalReason && (
                                        <div style={{ marginTop: '8px' }}>
                                            <span className="badge-type" style={{ fontSize: '10px', backgroundColor: '#e2e8f0', color: '#475569' }}>
                                                Category: {viewingRequest.withdrawalReason}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="detail-group advisor-section">
                                <label>Academic Advisor</label>
                                <div className="student-detail-chip">
                                    <User size={12} />
                                    <div className="std-info">
                                        <span className="std-name">
                                            {viewingRequest.academicAdvisorId?.staffName || "Not assigned yet"}
                                        </span>
                                        {viewingRequest.academicAdvisorId?._id && (
                                            <span className="std-id">ID: {viewingRequest.academicAdvisorId._id}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="advisor-comment-box" style={{
                                    marginTop: '10px', fontSize: '13px', color: '#64748b',
                                    fontStyle: 'italic', paddingLeft: '10px', borderLeft: '2px solid #e2e8f0'
                                }}>
                                    <strong>Advisor Comment:</strong>{" "}
                                    {viewingRequest.academicAdvisorComment || "No comment from advisor yet."}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoordinatorAcademicRequests;