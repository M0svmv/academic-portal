import React, { useState, useEffect } from 'react';
import {
    CheckCircle,
    XCircle,
    Clock,
    Search,
    Filter,
    Eye,
    MessageSquare,
    User,
    BookOpen,
    Calendar,
    AlertCircle,
    ClipboardList,
    ArrowUpCircle,
    ArrowDownCircle,
    RotateCcw,
    Plus,
    ChevronDown,
    Trash2,
    CheckCircle2,
    ArrowLeftRight,
    TrendingUp,
    FileMinus,
    Zap,
    X,
    FileText // أضفت أيقونة للتقرير
} from 'lucide-react';
import api from '../../services/api';
import swalService from "../../services/swal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const AdvisorAcademicRequests = () => {
    // States
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [advisorComment, setAdvisorComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [viewingRequest, setViewingRequest] = useState(null);

    // Fetch Requests
    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get("/academic-advisors/me/academic-requests");
            setRequests(res.data.requests || []);
        } catch (err) {
            console.error('Error fetching requests:', err);
            swalService.error("Failed to load student requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Function to generate PDF Report
    const generatePDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text("Academic Requests Summary Report", 14, 20);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Total Requests: ${filteredRequests.length}`, 14, 34);

        const tableColumn = ["Student Name", "ID", "Type", "Details", "Date", "Status"];
        const tableRows = [];

        filteredRequests.forEach(req => {
            // منطق استخراج التفاصيل للتقرير النصي
            let details = "";
            if (req.requestType === 'Add Drop') {
                details = `Add: ${req.addedCourses?.join(', ') || '-'} | Drop: ${req.droppedCourses?.join(', ') || '-'}`;
            } else if (req.requestType === 'Withdrawal' || req.requestType === 'improve Grade') {
                details = `Course: ${req.courseId || 'N/A'}`;
            } else if (req.requestType === 'Overload') {
                details = `Courses: ${req.addedCourses?.join(', ') || 'N/A'}`;
            } else {
                details = req.courseId || 'N/A';
            }

            const rowData = [
                req.studentId?.studentName || "N/A",
                req.studentId?.id || "N/A",
                req.requestType,
                details,
                new Date(req.createdAt).toLocaleDateString(),
                req.status.toUpperCase()
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillStyle: 'f1f5f9', textColor: [30, 41, 59], fontStyle: 'bold' },
            alternateRowStyles: { fillStyle: [248, 250, 252] },
        });

        doc.save(`Academic_Requests_Report_${new Date().getTime()}.pdf`);
    };

    // Handle Response (Approve/Reject)
    const handleRespond = async (requestId, status) => {
        if (!advisorComment && status === 'rejected') {
            swalService.error('Missing Comment', 'Please provide a reason for rejection');
            return;
        }

        try {
            setIsSubmitting(true);
            await api.put(`/academic-advisors/me/academic-requests/respond/${requestId}`, {
                status: status,
                academicAdvisorComment: advisorComment
            });

            swalService.success(`Request ${status === 'approved' ? 'Approved' : 'Rejected'} successfully`);
            await fetchRequests();
            setSelectedRequest(null);
            setAdvisorComment('');
        } catch (error) {
            console.error('Error responding to request:', error);
            swalService.error("Operation Failed", error.response?.data?.message || "Server error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Corrected Filter Logic
    const filteredRequests = requests.filter(req => {
        const studentName = req.studentId?.studentName?.toLowerCase() || '';
        const studentId = req.studentId?.id?.toString() || '';
        const term = searchTerm.toLowerCase();

        const matchesSearch = studentName.includes(term) || studentId.includes(term);
        const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
        const matchesType = typeFilter === '' || req.requestType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    // Stats calculation
    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    };

    // Internalized Styles
    const styles = {
        tableHeader: { padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: '600' },
        tableCell: { padding: '16px', fontSize: '14px' },
        modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
        modalContent: { backgroundColor: '#fff', width: '90%', maxWidth: '650px', borderRadius: '20px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }
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

    return (
        <div className="management-container">
            <header className="management-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="prereg-header">
                    <h2>Academic Requests</h2>
                </div>
                {/* زر تحميل التقرير */}
                <button
                    onClick={generatePDF}
                    className='btn-2'
                >
                    <FileText size={18} /> Export Report
                </button>
            </header>

            {/* Insights Grid */}
            <div className="insights-grid">
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-blue"><ClipboardList size={18} /></span>
                        <span className="insight-label">Total Requests</span>
                    </div>
                    <div className="insight-value">{stats.total}</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-orange"><Clock size={18} /></span>
                        <span className="insight-label">Pending</span>
                    </div>
                    <div className="insight-value">{stats.pending}</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-green"><CheckCircle2 size={18} /></span>
                        <span className="insight-label">Approved</span>
                    </div>
                    <div className="insight-value">{stats.approved}</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-purple"><AlertCircle size={18} /></span>
                        <span className="insight-label">Rejected</span>
                    </div>
                    <div className="insight-value">{stats.rejected}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-wrapper">
                <Search size={22} color="#9ca3af" />
                <input
                    className="search-input"
                    type="text"
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="Withdrawal">Withdrawal</option>
                    <option value="Add Drop">Add Drop</option>
                    <option value="improve Grade">Improve Grade</option>
                    <option value="Overload">Overload</option>
                </select>
            </div>

            {/* Table */}
            <div className="table-wrapper" >
                <table >
                    <thead style={{ backgroundColor: '#f1f5f9' }}>
                        <tr>

                            <th >Student</th>
                            <th >Type</th>
                            <th >Requested Changes</th>
                            <th >Date</th>
                            <th >Status</th>
                            <th >Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading requests...</td></tr>
                        ) : filteredRequests.length > 0 ? (
                            filteredRequests.map(req => (
                                <tr key={req._id} style={{ borderBottom: '1px solid #f1f5f9', transition: '0.2s' }}>
                                    <td style={styles.tableCell}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div>
                                                <div style={{ fontWeight: '600', color: '#1e293b' }}>{req.studentId?.studentName}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>ID: {req.studentId?.id}</div>
                                            </div>
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
                                    <td style={styles.tableCell}>{new Date(req.createdAt).toLocaleDateString()}</td>

                                    <td>
                                        <StatusBadge status={req.status} />
                                    </td>
                                    <td style={styles.tableCell}>
                                        <button
                                            className="btn-icon btn-view"
                                            title="View Details"
                                            onClick={() => setViewingRequest(req)}
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ padding: '60px 0', textAlign: 'center' }}>
                                    <div style={{ color: '#94a3b8' }}>
                                        <ClipboardList size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                        <p>No student requests found.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- Academic Request Details Drawer (Advisor View) --- */}
            {viewingRequest && (
                <div className="details-drawer-overlay" onClick={() => { setViewingRequest(null); setAdvisorComment(''); }}>
                    <div className="details-drawer" onClick={(e) => e.stopPropagation()}>

                        {/* Header - موحد مع ثيم الإعلانات وواجهة الطالب */}
                        <div className="drawer-header">
                            <div className="drawer-title-area">
                                <span className={`badge-type status-${viewingRequest.status.toLowerCase()}`}>
                                    {viewingRequest.status}
                                </span>
                                <h3>Academic Request Details</h3>
                            </div>
                            <button className="close-drawer-btn" onClick={() => { setViewingRequest(null); setAdvisorComment(''); }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="drawer-content">
                            {/* 1. Student & Semester Info */}
                            <div className="detail-row" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div className="detail-group">
                                    <label> Student Info</label>
                                    <div className="student-detail-chip">
                                        <div className="std-info">
                                            <span className="std-name">{viewingRequest.studentId?.studentName}</span>
                                            <span className="std-id">ID: {viewingRequest.studentId?._id || viewingRequest.studentId?.id}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="detail-row-grid">
                                    <div className="detail-group">
                                        <label> Request Type</label>
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

                            {/* 2. Specific Request Details */}
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

                            {/* 3. Reasons & Justification */}
                            <div className="detail-group">
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

                            {/* 4. Action Section - Logic المودال تم نقله هنا */}
                            <div className="advisor-action-section" style={{ marginTop: '25px', paddingTop: '20px', borderTop: '2px dashed #e2e8f0' }}>
                                {viewingRequest.status === 'pending' ? (
                                    <>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                                            Academic Advisor Feedback
                                        </label>
                                        <textarea
                                            placeholder="Provide feedback or reason for your decision..."
                                            value={advisorComment}
                                            onChange={(e) => setAdvisorComment(e.target.value)}
                                            style={{
                                                width: '100%', height: '100px', padding: '12px', borderRadius: '10px',
                                                border: '1px solid #e2e8f0', marginBottom: '20px', outline: 'none', fontSize: '14px',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                        <div className="detail-row-grid" style={{ display: 'flex', gap: '12px' }}>
                                            <button
                                                className="btn-approve"
                                                disabled={isSubmitting}
                                                onClick={() => handleRespond(viewingRequest._id, 'approved')}
                                                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                            >
                                                <CheckCircle size={18} /> Approve
                                            </button>
                                            <button
                                                className="btn-reject"
                                                disabled={isSubmitting}
                                                onClick={() => handleRespond(viewingRequest._id, 'rejected')}
                                                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                            >
                                                <XCircle size={18} /> Reject
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    /* عرض الرد في حالة أن الطلب ليس Pending */
                                    <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: viewingRequest.status === 'approved' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${viewingRequest.status === 'approved' ? '#10b981' : '#ef4444'}` }}>
                                        <div style={{ fontWeight: '700', color: viewingRequest.status === 'approved' ? '#065f46' : '#991b1b', marginBottom: '4px' }}>
                                            Decision: {viewingRequest.status.toUpperCase()}
                                        </div>
                                        <div style={{ fontSize: '14px', color: viewingRequest.status === 'approved' ? '#065f46' : '#991b1b' }}>
                                            <strong>Your Comment:</strong> {viewingRequest.academicAdvisorComment || "No comment provided"}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal */}
            {/* {selectedRequest && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>Review Request</h2>
                            <button onClick={() => { setSelectedRequest(null); setAdvisorComment(''); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                            <InfoGroup label="Student Name" value={selectedRequest.studentId.studentName} icon={<User size={16} />} />
                            <InfoGroup label="Student ID" value={selectedRequest.studentId.id} icon={<AlertCircle size={16} />} />
                            <InfoGroup label="Semester" value={selectedRequest.semesterId.name} icon={<Calendar size={16} />} />
                            <InfoGroup label="Type" value={selectedRequest.requestType} icon={<ClipboardList size={16} />} />
                        </div>

                        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MessageSquare size={16} /> Student Justification
                            </h3>
                            <p style={{ margin: 0, color: '#1e293b', fontWeight: '500', fontStyle: 'italic', lineHeight: '1.6' }}>
                                "{selectedRequest.writtenReason || selectedRequest.studentSuggestion || "No explanation provided"}"
                            </p>
                            {selectedRequest.withdrawalReason && (
                                <div style={{ marginTop: '10px', fontSize: '13px', color: '#64748b' }}>
                                    <strong>Category:</strong> {selectedRequest.withdrawalReason}
                                </div>
                            )}
                        </div>

                        {selectedRequest.status === 'pending' ? (
                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                                    Academic Advisor Feedback
                                </label>
                                <textarea
                                    placeholder="Provide feedback or reason for your decision..."
                                    value={advisorComment}
                                    onChange={(e) => setAdvisorComment(e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: '100px',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        marginBottom: '20px',
                                        outline: 'none',
                                        fontSize: '14px'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        disabled={isSubmitting}
                                        onClick={() => handleRespond(selectedRequest._id, 'approved')}
                                        style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <CheckCircle size={18} /> Approve
                                    </button>
                                    <button
                                        disabled={isSubmitting}
                                        onClick={() => handleRespond(selectedRequest._id, 'rejected')}
                                        style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#b44d4b', color: '#fff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <XCircle size={18} /> Reject
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: selectedRequest.status === 'approved' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${selectedRequest.status === 'approved' ? '#10b981' : '#ef4444'}` }}>
                                <div style={{ fontWeight: '700', color: selectedRequest.status === 'approved' ? '#065f46' : '#991b1b', marginBottom: '4px' }}>
                                    Result: {selectedRequest.status.toUpperCase()}
                                </div>
                                <div style={{ fontSize: '14px', color: selectedRequest.status === 'approved' ? '#065f46' : '#991b1b' }}>
                                    <strong>Advisor Comment:</strong> {selectedRequest.academicAdvisorComment || "No comment provided"}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )} */}
        </div>
    );
};



const InfoGroup = ({ label, value, icon }) => (
    <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>
            {icon} {label}
        </label>
        <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: '600' }}>{value || 'N/A'}</div>
    </div>
);



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
export default AdvisorAcademicRequests;

