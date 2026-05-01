import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import swalService from "../../services/swal";
import {
    Plus,
    ChevronDown,
    Trash2,
    Search,
    ClipboardList,
    AlertCircle,
    CheckCircle2,
    Clock,
    ArrowLeftRight,
    TrendingUp,
    FileMinus,
    Zap,
    X,
    Check,
    Eye,
    User,
    Calendar, ArrowUpCircle, ArrowDownCircle, XCircle
} from 'lucide-react';
import '../styles/ProgramCourses.css';
import './styles/StuReq.css'

const WITHDRAWAL_REASONS = [
    "Academic Difficulty", "Health Issues", "Not Ready for Final Exam",
    "Absence without Notice", "Absence from midterm or practical",
    "Low semester Work Performance", "Personal Reasons", "Other"
];

const StudentRequestsManagement = () => {
    const [requests, setRequests] = useState([]);
    const [search, setSearch] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [modalType, setModalType] = useState(null);
    const [filterType, setFilterType] = useState('');

    const [viewingRequest, setViewingRequest] = useState(null);

    const [activeCustomDropdown, setActiveCustomDropdown] = useState(null);
    const [dropdownSearch, setDropdownSearch] = useState('');
    const dropdownRef = useRef(null);

    const [currentEnrollments, setCurrentEnrollments] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [passedCourses, setPassedCourses] = useState([]);

    const [formData, setFormData] = useState({
        courseId: '',
        withdrawalReason: '',
        writtenReason: '',
        studentSuggestion: '',
        addedCourses: [],
        droppedCourses: []
    });

    const fetchRequests = async () => {
        try {
            const res = await api.get("/student/me/academic-requests");
            console.log(res)
            setRequests(res.data.Requests || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchCurrentEnrollments = async () => {
        try {
            const enrolledRes = await api.get("/student/me/enrollments/current");

            const coursesList = enrolledRes.data.courses || [];

            const normalized = coursesList.map(c => ({
                _id: c.courseOfferingId?.courseId?._id,
                courseName: c.courseOfferingId?.courseId?.courseName
            }));

            setCurrentEnrollments(normalized);
        } catch (err) {
            console.error("Error fetching current enrollments:", err);
        }
    };

    const fetchAvailableCourses = async () => {
        try {
            const availableRes = await api.get("/student/me/available-courses");

            const normalized = availableRes.data.availableOfferings.map(c => ({
                _id: c.courseId._id,
                courseName: c.courseId.courseName
            }));

            setAvailableCourses(normalized);
        } catch (err) {
            console.error("Error fetching available courses:", err);
        }
    };

    const fetchPassedCourses = async () => {
        try {
            const res = await api.get("/student/me/details");
            const completed = res.data.transcript?.completedCourses || [];
            setPassedCourses(completed.filter(c => c.status === 'passed'));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchRequests();
        fetchCurrentEnrollments();
        fetchAvailableCourses();
        fetchPassedCourses();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveCustomDropdown(null);
                setDropdownSearch('');
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length
    };

    const resetForm = () => {
        setFormData({
            courseId: '',
            withdrawalReason: '',
            writtenReason: '',
            studentSuggestion: '',
            addedCourses: [],
            droppedCourses: []
        });
        setDropdownSearch('');
    };

    const openModal = (type) => {
        resetForm();
        setModalType(type);
        setDropdownOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        swalService.showLoading("Submitting your request...");

        // دالة مبسطة لأننا جهزنا البيانات في الـ fetch
        const mapToIds = (ids, sourceArray) => {
            return ids.map(id => {
                const found = sourceArray.find(item => item._id === id);
                return found?._id || id;
            });
        };

        try {
            let endpoint = "";
            let payload = {};

            switch (modalType) {
                case 'withdrawal':
                    endpoint = "/student/me/academic-requests/withdraw";
                    payload = {
                        courseId: formData.courseId,
                        withdrawalReason: formData.withdrawalReason,
                        writtenReason: formData.writtenReason,
                        studentSuggestion: formData.studentSuggestion
                    };
                    break;
                case 'add-drop':
                    endpoint = "/student/me/academic-requests/add-drop";
                    payload = {
                        addedCourses: mapToIds(formData.addedCourses, availableCourses),
                        droppedCourses: mapToIds(formData.droppedCourses, currentEnrollments),
                        studentSuggestion: formData.studentSuggestion
                    };
                    break;

                case 'improve':

                    endpoint = "/student/me/academic-requests/improve-grade";

                    payload = {

                        courseId: formData.courseId,

                        writtenReason: formData.writtenReason,

                        studentSuggestion: formData.studentSuggestion

                    };

                    break;

                case 'overload':
                    endpoint = "/student/me/academic-requests/overload";
                    payload = {
                        addedCourses: mapToIds(formData.addedCourses, availableCourses),
                        writtenReason: formData.writtenReason,
                        studentSuggestion: formData.studentSuggestion
                    };
                    break;
            }

            await api.post(endpoint, payload);
            swalService.success("Success", "Your request has been submitted.");
            setModalType(null);
            fetchRequests();
        } catch (err) {
            swalService.error("Submission Failed", err.response?.data?.message || "Something went wrong");
        }
    };
    const deleteRequest = async (requestId) => {
        const result = await swalService.confirm(
            "Cancel Request?",
            "Are you sure you want to delete this pending request?",
            "Yes, Delete",
            "warning"
        );

        if (result.isConfirmed) {
            try {
                await api.delete(`/student/me/academic-requests/${requestId}`);
                swalService.success("Deleted", "Request removed successfully");
                fetchRequests();
            } catch (err) {
                swalService.error("Error", "Could not delete request");
            }
        }
    };

    const filteredRequests = requests.filter(r =>
        (r.requestType?.toLowerCase().includes(search.toLowerCase()) ||
            (r.courseId?.courseName || "").toLowerCase().includes(search.toLowerCase())) &&
        (filterType ? r.requestType === filterType : true)
    );

    const toggleSelection = (id, field) => {
        if (!id) return;
        const currentSelected = [...formData[field]];
        const index = currentSelected.indexOf(id);
        if (index > -1) {
            currentSelected.splice(index, 1);
        } else {
            currentSelected.push(id);
        }
        setFormData({ ...formData, [field]: currentSelected });
    };

    const CustomMultiSelect = ({ options, selectedValues, onToggle, field, placeholder }) => {
        const filteredOptions = options.filter(opt => {
            const name = opt.courseName || opt.courseId?.courseName || "";
            const id = opt._id || "";
            return name.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
                id.toLowerCase().includes(dropdownSearch.toLowerCase());
        });

        return (
            <div className="custom-select-container" ref={activeCustomDropdown === field ? dropdownRef : null}>
                <div className="selected-tags-container">
                    {selectedValues.map(valId => {
                        const item = options.find(o => (o._id === valId || o.courseOfferingId === valId || o.courseId?._id === valId));
                        const displayLabel = item?.courseName || item?.courseId?.courseName || valId;
                        return (
                            <span key={valId} className="select-tag">
                                {displayLabel}
                                <X size={12} onClick={(e) => { e.stopPropagation(); onToggle(valId, field); }} />
                            </span>
                        );
                    })}
                </div>

                <div
                    className={`custom-select-trigger ${activeCustomDropdown === field ? 'active' : ''}`}
                    onClick={() => setActiveCustomDropdown(activeCustomDropdown === field ? null : field)}
                >
                    <span>{selectedValues.length > 0 ? `Selected ${selectedValues.length} items` : placeholder}</span>
                    <ChevronDown size={18} className={`arrow ${activeCustomDropdown === field ? 'up' : ''}`} />
                </div>

                {activeCustomDropdown === field && (
                    <div className="custom-select-dropdown">
                        <div className="dropdown-search-wrapper">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Type name or ID..."
                                value={dropdownSearch}
                                onChange={(e) => setDropdownSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="dropdown-options-list">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map(opt => {
                                    const id = opt._id;
                                    const name = opt.courseName || opt.courseId?.courseName;
                                    if (!id) return null;
                                    const isSelected = selectedValues.includes(id);
                                    return (
                                        <div
                                            key={id}
                                            className={`dropdown-option-item ${isSelected ? 'selected' : ''}`}
                                            onClick={() => onToggle(id, field)}
                                        >
                                            <div className="option-info">
                                                <span className="option-name">{name}</span>
                                                <span className="option-id">ID: {opt.courseId?._id || id}</span>
                                            </div>
                                            {isSelected && <Check size={16} className="check-icon" />}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="no-options">No results found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };


    const sortedRequests = [...filteredRequests].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
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

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="prereg-header">
                    <h2>Academic Requests</h2>
                </div>

                <div className="header-actions">
                    <div className="split-button-container">
                        <button className="main-add-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                            <Plus size={18} /> New Request
                        </button>
                        <button className="dropdown-toggle-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                            <ChevronDown size={18} />
                        </button>
                        {dropdownOpen && (
                            <div className="split-dropdown-menu" style={{ width: '200px' }}>
                                <button className="dropdown-item" onClick={() => openModal('withdrawal')}>
                                    <FileMinus size={14} /> Withdrawal Request
                                </button>
                                <button className="dropdown-item" onClick={() => openModal('add-drop')}>
                                    <ArrowLeftRight size={14} /> Add / Drop
                                </button>
                                <button className="dropdown-item" onClick={() => openModal('improve')}>
                                    <TrendingUp size={14} /> Improve Grade
                                </button>
                                <button className="dropdown-item" onClick={() => openModal('overload')}>
                                    <Zap size={14} /> Overload Request
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

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

            <div className="filters-wrapper">
                <Search size={22} color="#9ca3af" />
                <input
                    className="search-input"
                    type="text"
                    placeholder="Search requests..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="Withdrawal">Withdrawal</option>
                    <option value="Add Drop">Add Drop</option>
                    <option value="improve Grade">Improve Grade</option>
                    <option value="Overload">Overload</option>
                </select>
            </div>

            {/* --- جدول الطلبات الأكاديمية --- */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th >Course / Action</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* ترتيب المصفوفة: الأحدث (التاريخ الأكبر) يظهر أولاً */}
                        {[...filteredRequests]
                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                            .map(req => (
                                <tr key={req._id} className={req.requestType === 'Withdrawal' ? 'type-withdrawal-row' : 'type-adddrop-row'}>
                                    <td style={{ fontWeight: '600' }}>
                                        <div className="type-column-info">
                                            {req.requestType}

                                        </div>
                                    </td>
                                    <td >
                                        <RequestSummaryView request={req} />
                                    </td>
                                    <td >
                                        <StatusBadge status={req.status} />
                                    </td>
                                    <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                                        {new Date(req.createdAt).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div className="action-btns">
                                            {/* زرار عرض التفاصيل يفتح الدرور */}
                                            <button className="btn-icon btn-view" title="View Details" onClick={() => setViewingRequest(req)}>
                                                <Eye size={18} />
                                            </button>

                                            {req.status === 'pending' && (
                                                <button className="btn-icon btn-delete" title="Delete Request" onClick={() => deleteRequest(req._id)}>
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {/* --- Academic Request Details Drawer --- */}
            {viewingRequest && (
                <div className="details-drawer-overlay" onClick={() => setViewingRequest(null)}>
                    <div className="details-drawer" onClick={(e) => e.stopPropagation()}>

                        {/* Header - موحد مع ثيم الإعلانات */}
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
                            <div className="detail-row-grid">
                                <div className="detail-group">
                                    <label>Request Type</label>
                                    <p className="detail-value title">{viewingRequest.requestType}</p>
                                </div>
                                <div className="detail-group">
                                    <label><Calendar size={14} /> Submitted On</label>
                                    <p className="detail-value">
                                        {new Date(viewingRequest.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <hr className="drawer-divider" />

                            {/* --- عرض التفاصيل بناءً على نوع الطلب --- */}
                            <div className="specific-details">

                                {/* 1. طلبات الـ Withdrawal أو improve Grade (تستخدم courseId) */}
                                {(viewingRequest.requestType === "Withdrawal" || viewingRequest.requestType === "improve Grade") && (
                                    <div className="detail-group">
                                        <label>Target Course</label>
                                        <p className="detail-value highlight">
                                            {viewingRequest.courseId?.courseName || viewingRequest.courseId?._id || viewingRequest.courseId}
                                            {viewingRequest.courseId?._id && <span className="sub-id"> ({viewingRequest.courseId._id})</span>}
                                        </p>
                                    </div>
                                )}

                                {/* 2. سبب السحب (فقط في طلبات السحب) */}
                                {viewingRequest.requestType === "Withdrawal" && (
                                    <div className="detail-group">
                                        <label>Withdrawal Reason</label>
                                        <p className="detail-value">{viewingRequest.withdrawalReason}</p>
                                    </div>
                                )}

                                {/* 3. طلبات الـ Add Drop أو Overload (تستخدم المصفوفات) */}
                                {(viewingRequest.requestType === "Add Drop" || viewingRequest.requestType === "Overload") && (
                                    <div className="detail-row">
                                        <div className="detail-group">
                                            <label>Added Courses</label>
                                            <div className="course-chips detail-value-green">
                                                {viewingRequest.addedCourses?.length > 0 ? (
                                                    viewingRequest.addedCourses.map(c => (
                                                        <span key={c._id || c} className="chip add">
                                                            {c.courseName || c} {c._id ? `(${c._id})` : ''}
                                                        </span>
                                                    ))
                                                ) : <p>None</p>}
                                            </div>
                                        </div>

                                        {viewingRequest.requestType === "Add Drop" && (
                                            <div className="detail-group">
                                                <label>Dropped Courses</label>
                                                <div className="course-chips detail-value-green">
                                                    {viewingRequest.droppedCourses?.length > 0 ? (
                                                        viewingRequest.droppedCourses.map(c => (
                                                            <span key={c._id || c} className="chip drop">
                                                                {c.courseName || c} {c._id ? `(${c._id})` : ''}
                                                            </span>
                                                        ))
                                                    ) : <p>None</p>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 4. السبب المكتوب (للسحب، التحسين، الأوفر لود) */}
                                {viewingRequest.writtenReason && (
                                    <div className="detail-group">
                                        <label>Detailed Statement / Reason</label>
                                        <p className="detail-value content-full">{viewingRequest.writtenReason}</p>
                                    </div>
                                )}
                            </div>

                            <hr className="drawer-divider" />

                            {/* ملاحظات الطالب */}
                            <div className="detail-group">
                                <label>Your Suggestion/Notes</label>
                                <p className="detail-value content-full">
                                    {viewingRequest.studentSuggestion || "No additional notes provided."}
                                </p>
                            </div>

                            {/* المرشد الأكاديمي */}
                            <div className="detail-group advisor-section">
                                <label><User size={14} /> Academic Advisor</label>
                                <div className="student-detail-chip">
                                    <User size={12} />
                                    <div className="std-info">
                                        <span className="std-name">
                                            {viewingRequest.academicAdvisorId?.staffName || "Pending Assignment"}
                                        </span>
                                        {viewingRequest.academicAdvisorId?._id && (
                                            <span className="std-id">ID: {viewingRequest.academicAdvisorId._id}</span>
                                        )}
                                    </div>
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

            {modalType && (
                <div className="modal-overlay">
                    <div className="modal-card wide">
                        <div className="modal-head">
                            <h3>{modalType.replace('-', ' ').toUpperCase()} REQUEST</h3>
                            <button className="close-x-btn" onClick={() => setModalType(null)}><X size="20" /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {modalType === 'withdrawal' && (
                                    <>
                                        <div className="form-group">
                                            <label>Select Registered Course to Withdraw</label>
                                            <select
                                                required
                                                value={formData.courseId}
                                                onChange={e => setFormData({ ...formData, courseId: e.target.value })}
                                            >
                                                <option value="">Choose Course...</option>
                                                {currentEnrollments.map(en => (
                                                    <option key={en._id} value={en._id}>
                                                        {en._id} - {en.courseName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Withdrawal Reason Category</label>
                                            <select
                                                required
                                                value={formData.withdrawalReason}
                                                onChange={e => setFormData({ ...formData, withdrawalReason: e.target.value })}
                                            >
                                                <option value="">Choose reason...</option>
                                                {WITHDRAWAL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}

                                {modalType === 'improve' && (
                                    <div className="form-group">
                                        <label>Select Previously Passed Course to Improve</label>
                                        <select
                                            required
                                            value={formData.courseId}
                                            onChange={e => setFormData({ ...formData, courseId: e.target.value })}
                                        >
                                            <option value="">Choose Course...</option>
                                            {passedCourses.map(c => (
                                                c.courseId && (
                                                    <option key={c.courseId._id} value={c.courseId._id}>
                                                        {c.courseId._id} - {c.courseId.courseName} (Grade: {c.grade})
                                                    </option>
                                                )
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {modalType === 'add-drop' && (
                                    <>
                                        <div className="form-group">
                                            <label>Add Courses (From Available Courses)</label>
                                            <CustomMultiSelect
                                                options={availableCourses}
                                                selectedValues={formData.addedCourses}
                                                onToggle={toggleSelection}
                                                field="addedCourses"
                                                placeholder="Select courses to add..."
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Drop Courses (From Current Enrollments)</label>
                                            <CustomMultiSelect
                                                options={currentEnrollments}
                                                selectedValues={formData.droppedCourses}
                                                onToggle={toggleSelection}
                                                field="droppedCourses"
                                                placeholder="Select courses to drop..."
                                            />
                                        </div>
                                    </>
                                )}

                                {modalType === 'overload' && (
                                    <div className="form-group">
                                        <label>Select Courses for Overload</label>
                                        <CustomMultiSelect
                                            options={availableCourses}
                                            selectedValues={formData.addedCourses}
                                            onToggle={toggleSelection}
                                            field="addedCourses"
                                            placeholder="Select courses for overload..."
                                        />
                                        <small className="help-text">Select the courses that exceed your credit limit</small>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Written Reason / Justification</label>
                                    <textarea
                                        className="cell-input"
                                        style={{ border: '1px solid #cbd5f5', borderRadius: '6px', padding: '10px', minHeight: '80px' }}
                                        value={formData.writtenReason}
                                        onChange={e => setFormData({ ...formData, writtenReason: e.target.value })}
                                        placeholder="Explain why you are making this request..."

                                    />
                                </div>

                                <div className="form-group">
                                    <label>Additional Suggestions (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.studentSuggestion}
                                        onChange={e => setFormData({ ...formData, studentSuggestion: e.target.value })}
                                        placeholder="Any suggestions for the department?"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setModalType(null)}>Cancel</button>
                                <button type="submit" className="btn-1">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
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
const RequestSummaryView = ({ request }) => {
    const courseName = request.courseId?.courseName || request.courseId || "Multiple Courses";

    switch (request.requestType) {
        case 'Add Drop':
            return (
                <div style={{ fontSize: '12px' }}>
                    <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><ArrowUpCircle size={12} /> Added: {request.addedCourses?.length || 0}</div>
                    <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}><ArrowDownCircle size={12} /> Dropped: {request.droppedCourses?.length || 0}</div>
                </div>
            );
        case 'Withdrawal':
            return <div style={{ color: '#ef4444', fontWeight: '500' }}>Withdraw: {courseName}</div>;
        case 'improve Grade':
            return <div style={{ color: '#6366f1', fontWeight: '500' }}>Improve: {courseName}</div>;
        case 'Overload':
            return <div style={{ color: '#f59e0b', fontWeight: '500' }}>Credit Overload</div>;
        default:
            return <span>{courseName}</span>;
    }
};

export default StudentRequestsManagement;



