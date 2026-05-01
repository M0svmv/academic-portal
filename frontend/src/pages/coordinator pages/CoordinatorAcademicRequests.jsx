import React, { useState, useEffect } from 'react';
import {
    ClipboardList,
    Search,
    Filter,
    Eye,
    User,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowUpCircle,
    ArrowDownCircle,
    RotateCcw,
    XCircle,
    FileText,
    LayoutDashboard, X, MessageSquare
} from 'lucide-react';
import api from '../../services/api';
import swalService from "../../services/swal";

const CoordinatorAcademicRequests = () => {
    // States

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [viewingRequest, setViewingRequest] = useState(null);
    // Fetch All Requests for Coordinator
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

    useEffect(() => {
        fetchAllRequests();
    }, []);

    // Filter Logic
    const filteredRequests = requests.filter(req => {
        const studentName = req.studentId?.studentName?.toLowerCase() || '';
        const advisorName = req.academicAdvisorId?.staffName?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();

        const matchesSearch = studentName.includes(term) || advisorName.includes(term);
        const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
        const matchesType = typeFilter === '' || req.requestType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    // Stats for Dashboard view
    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    };

    // Unified Styles
    const styles = {
        tableHeader: { padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: '600', textAlign: 'left' },
        tableCell: { padding: '16px', fontSize: '14px', borderBottom: '1px solid #f1f5f9' },
        modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' },
        modalContent: { backgroundColor: '#fff', width: '90%', maxWidth: '700px', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', maxHeight: '85vh', overflowY: 'auto' }
    };

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="prereg-header">
                    <h2>Academic Requests</h2>
                </div>
            </header>

            {/* Global Insights */}
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

            {/* Control Bar */}
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

            {/* --- Requests Table Section --- */}
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
                                    Fetching academic records...
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
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                backgroundColor: '#f1f5f9',
                                                color: '#475569'
                                            }}>{req.requestType}</span>
                                        </td>
                                        <td>
                                            <RequestSummaryView request={req} />
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={12} />
                                                </div>
                                                <span style={{ fontSize: '13px' }}>
                                                    {req.academicAdvisorId?.staffName || "Unassigned"}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <StatusBadge status={req.status} />
                                        </td>
                                        <td>
                                            <div className="action-btns" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                <button
                                                    className="btn-icon btn-view"
                                                    title="View Details"
                                                    onClick={() => setViewingRequest(req)}
                                                >
                                                    <Eye size={18} />
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

            {/* --- Academic Request Details Drawer (Coordinator View) --- */}
            {viewingRequest && (
                <div className="details-drawer-overlay" onClick={() => setViewingRequest(null)}>
                    <div className="details-drawer" onClick={(e) => e.stopPropagation()}>

                        {/* Header - موحد مع ثيم الإعلانات وواجهة الطالب */}
                        <div className="drawer-header">
                            <div className="drawer-title-area">
                                <span className={`badge-type status-${viewingRequest.status.toLowerCase()}`}>
                                    {viewingRequest.status}
                                </span>
                                <h3>Academic Request Details</h3>
                            </div>
                            <button className="close-drawer-btn" onClick={() => setViewingRequest(null)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="drawer-content">
                            {/* 1. Student & Semester Info - عرض بيانات الطالب الأساسية */}
                            <div className="detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div className="detail-group">
                                    <label> Student Info</label>
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


                                {/* Case: Withdrawal or Improve Grade */}
                                {(viewingRequest.requestType === "Withdrawal" || viewingRequest.requestType === "improve Grade") && (
                                    <div className="detail-group">
                                        <label>Target Course</label>
                                        <p className="detail-value highlight">
                                            {viewingRequest.courseId?.courseName || viewingRequest.courseId || "N/A"}
                                            {viewingRequest.courseId?._id && <span className="sub-id"> ({viewingRequest.courseId._id})</span>}
                                        </p>
                                    </div>
                                )}

                                {/* Case: Add Drop or Overload */}
                                {(viewingRequest.requestType === "Add Drop" || viewingRequest.requestType === "Overload") && (
                                    <div className="detail-row">
                                        <div className="detail-group">
                                            <label >Added Courses</label>
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

                            {/* 3. Reasons & Comments - المبررات والملاحظات */}
                            <div className="detail-group" style={{ marginBottom: '12px' }}>
                                <label> Student Justification</label>
                                <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
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

                            {/* 4. Advisor Information - مراجعة المرشد الأكاديمي */}
                            <div className="detail-group advisor-section">
                                <label> Academic Advisor</label>
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
                                <div className="advisor-comment-box" style={{ marginTop: '10px', fontSize: '13px', color: '#64748b', fontStyle: 'italic', paddingLeft: '10px', borderLeft: '2px solid #e2e8f0' }}>
                                    <strong>Advisor Comment:</strong> {viewingRequest.academicAdvisorComment || "No comment from advisor yet."}
                                </div>
                            </div>

                            {/* Footer Action */}
                            <div style={{ marginTop: '30px' }}>
                                {/* <button className="btn-cancel" style={{ width: '100%' }} onClick={() => setViewingRequest(null)}>
                                    Close Details
                                </button> */}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const RequestSummaryView = ({ request }) => {
    const courseName = request.courseId?._id || request.courseId || "Multiple Courses";

    switch (request.requestType) {
        case 'Add Drop':
            return (
                <div style={{ fontSize: '14px', display: 'flex', gap: '5px' }}>
                    <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}><ArrowUpCircle size={16} /> Added: {request.addedCourses?.length || 0}</div>
                    <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}><ArrowDownCircle size={16} /> Dropped: {request.droppedCourses?.length || 0}</div>
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
        rejected: { bg: '#fef2f2', text: '#b91c1c', icon: <XCircle size={12} /> }
    };
    const config = map[status] || map.pending;
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '700',
            backgroundColor: config.bg,
            color: config.text,
            textTransform: 'uppercase'
        }}>
            {config.icon} {status}
        </span>
    );
};

const InfoBox = ({ label, value, icon }) => (
    <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
            {icon} {label}
        </div>
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>{value || 'Not available'}</div>
    </div>
);

export default CoordinatorAcademicRequests;