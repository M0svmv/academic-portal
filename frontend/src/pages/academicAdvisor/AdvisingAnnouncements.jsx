import React, { useState, useEffect, useMemo } from "react";
import {
    Megaphone, Plus, Search, Edit3, Trash2,
    Calendar, ArrowUpRight, TrendingUp, X,
    LayoutGrid, List, UserCheck, Check, ChevronDown, User, Filter, Users, Eye
} from "lucide-react";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import swalService from "../../services/swal";
import api from "../../services/api";
import "../styles/Announcements.css";
import "./styles/AdviseAnnouncements.css";

const AdvisingAnnouncements = () => {
    // --- States ---
    const [layout, setLayout] = useState("table");
    const [announcements, setAnnouncements] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [targetFilter, setTargetFilter] = useState("all");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editingAnn, setEditingAnn] = useState(null);
    const [viewingAnn, setViewingAnn] = useState(null);
    const [viewMode, setViewMode] = useState("week");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [studentSearch, setStudentSearch] = useState("");
    const [myStudents, setMyStudents] = useState([]);
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        type: "general",
        target: "advisingList",
        expiresAt: "",
        studentsIds: []
    });

    const types = ["general", "urgent", "event", "deadline", "warning"];

    const getDateKey = (date) => {
        if (!date) return "";
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [annRes, studentsRes] = await Promise.all([
                api.get("/academic-advisors/me/advising-list/announcements"),
                api.get("/academic-advisors/me/list")
            ]);
            setAnnouncements(annRes.data);
            const allStudents = studentsRes.data.flatMap(list => list.students.map(s => s.student));
            setMyStudents(allStudents);
        } catch (err) {
            console.error("Error fetching data:", err);
            swalService.error("Error", "Failed to load announcements.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // --- Chart Logic ---
    const chartData = useMemo(() => {
        const range = viewMode === "week" ? 7 : 30;
        const days = [...Array(range)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return getDateKey(d);
        }).reverse();

        return days.map((date) => {
            const d = new Date(date);
            const label = viewMode === "week"
                ? d.toLocaleDateString("en-US", { weekday: "short" })
                : d.toLocaleDateString("en-US", { day: "numeric", month: "short" });

            return {
                name: label,
                posts: announcements.filter((a) => getDateKey(a.createdAt) === date).length,
                fullDate: d.toLocaleDateString("en-US", { dateStyle: "medium" }),
            };
        });
    }, [announcements, viewMode]);


    const filteredData = useMemo(() => {
        return announcements.filter((ann) => {
            const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ann.content.toLowerCase().includes(searchTerm.toLowerCase());
            const annDate = ann.createdAt ? getDateKey(ann.createdAt) : "";
            const matchesDate = dateFilter ? annDate === dateFilter : true;
            const matchesType = typeFilter === "all" ? true : ann.type === typeFilter;

            let matchesTarget = true;
            if (targetFilter === "everyone") {
                matchesTarget = ann.target !== "specificStudents";
            } else if (targetFilter !== "all") {
                matchesTarget = ann.targetIds?.includes(targetFilter);
            }

            return matchesSearch && matchesDate && matchesType && matchesTarget;
        });
    }, [announcements, searchTerm, dateFilter, typeFilter, targetFilter]);


    const handleEdit = (ann) => {
        setEditingAnn(ann);
        setFormData({
            title: ann.title,
            content: ann.content,
            type: ann.type || "general",
            expiresAt: ann.expiresAt ? getDateKey(ann.expiresAt) : "",
            studentsIds: ann.targetIds || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const result = await swalService.confirm("Delete Announcement?", "This action cannot be undone.");
        if (result.isConfirmed) {
            try {
                await api.delete(`/academic-advisors/me/advising-list/announcement/${id}`);
                swalService.success("Deleted!", "Announcement removed.");
                fetchData();
            } catch (err) { swalService.error("Error", "Failed to delete."); }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        try {
            setSubmitting(true);
            const isSpecific = formData.studentsIds.length > 0;
            if (editingAnn) {
                await api.put(`/academic-advisors/me/advising-list/announcement/${editingAnn._id}`, formData);
            } else {
                const endpoint = isSpecific ? "/academic-advisors/me/advising-list/announcement/specific-students" : "/academic-advisors/me/advising-list/announcement";
                await api.post(endpoint, formData);
            }
            setIsModalOpen(false);
            fetchData();
            setFormData({ title: "", content: "", type: "general", expiresAt: "", studentsIds: [] });
        } catch (err) { swalService.error("Save Error", "Failed to save."); } finally { setSubmitting(false); }
    };

    const toggleStudentSelection = (id) => {
        setFormData(prev => ({
            ...prev,
            studentsIds: prev.studentsIds.includes(id) ? prev.studentsIds.filter(sid => sid !== id) : [...prev.studentsIds, id]
        }));
    };

    return (
        <div className="management-container advising-ann-container">
            {/* Header */}
            <div className="page-header-section">
                <div className="prereg-header">
                    <h2>Advising Announcements</h2>
                </div>
                <button className="btn-1" onClick={() => { setEditingAnn(null); setIsModalOpen(true); }}>
                    <Plus size={18} /> New Announcement
                </button>
            </div>

            {/* Insights Section */}
            <div className="insights-grid">
                <div className="stat-card">
                    <div className="stat-icon"><Megaphone size={24} /></div>
                    <div className="stat-info">
                        <h3>{announcements.length}</h3>
                        <p>Total Sent</p>
                    </div>
                    <div className="stat-trend positive"><ArrowUpRight size={14} /> Live</div>
                </div>

                <div className="chart-card">
                    <div className="chart-header">
                        <h4><TrendingUp size={16} /> Broadcast Activity</h4>
                        <div className="view-toggle">
                            <button className={viewMode === "week" ? "active" : ""} onClick={() => setViewMode("week")}>Week</button>
                            <button className={viewMode === "month" ? "active" : ""} onClick={() => setViewMode("month")}>Month</button>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3a86ff" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3a86ff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Tooltip labelFormatter={(v, p) => p[0]?.payload?.fullDate || v} />
                            <Area type="monotone" dataKey="posts" stroke="#3a86ff" fill="url(#colorPosts)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Comprehensive Filters Row */}
            <div className="filters-bar-modern">
                <div className="filters-upper-row">
                    <div className="filter-group-horizontal">
                        <div className="filter-item">
                            <Filter size={16} />
                            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                                <option value="all">All Types</option>
                                {types.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                            </select>
                        </div>

                        <div className="filter-item">
                            <User size={16} />
                            <select value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)}>
                                <option value="all">All Targets</option>
                                <option value="everyone">General (Everyone)</option>
                                <optgroup label="Specific Students">
                                    {myStudents.map(s => <option key={s.id} value={s.id}>{s.studentName}</option>)}
                                </optgroup>
                            </select>
                        </div>

                        <div className="filter-item date">
                            <Calendar size={16} />
                            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                            {dateFilter && <X size={14} className="clear-icon" onClick={() => setDateFilter("")} />}
                        </div>
                    </div>

                    <div className="layout-toggle">
                        <button className={layout === "table" ? "active" : ""} onClick={() => setLayout("table")}><List size={20} /></button>
                        <button className={layout === "grid" ? "active" : ""} onClick={() => setLayout("grid")}><LayoutGrid size={20} /></button>
                    </div>
                </div>

                <div className="filter-summary" style={{
                    display: 'flex', gap: '10px', justifyContent: 'center'
                }}>
                    Showing <strong>{filteredData.length}</strong> announcements
                    {(typeFilter !== "all" || targetFilter !== "all" || dateFilter) && " based on your filters"}
                </div>
            </div>

            {/* List Display */}
            {loading ? (
                <div className="loading-state">Loading...</div>
            ) : filteredData.length > 0 ? (
                layout === "table" ? (
                    <div className="table-wrapper">
                        <table className="advising-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Content Preview</th>
                                    <th>Expiry Date</th>
                                    <th>Target Recipient</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map(ann => (
                                    <tr key={ann._id} onClick={() => setViewingAnn(ann)} style={{ cursor: 'pointer' }}>
                                        <td className="content-cell" style={{ fontWeight: '550' }}>{ann.title}</td>
                                        <td><span className={`badge-type ${ann.type}`}>{ann.type}</span></td>
                                        <td className="content-cell">{ann.content}</td>
                                        <td>{ann.expiresAt ? new Date(ann.expiresAt).toLocaleDateString() : "Permanent"}</td>
                                        <td>
                                            {ann.target === "specificStudents" ? (

                                                <span className="badge-stu">
                                                    <Users size={12} style={{ marginRight: '4px' }} />
                                                    {ann.targetIds?.length} Students
                                                </span>
                                            ) : (
                                                <span className="badge-all">All Students</span>
                                            )}
                                        </td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <div className="action-btns" >
                                                {/* <button onClick={() => setViewingAnn(ann)} className="btn-view" title="View Details"><Eye size={18} /></button> */}
                                                <button onClick={() => handleEdit(ann)} className="btn-edit"><Edit3 size={18} /></button>
                                                <button onClick={() => handleDelete(ann._id)} className="btn-delete"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="announcements-grid">
                        {filteredData.map(ann => (
                            <div key={ann._id} className={`announcement-card border-${ann.type}`} onClick={() => setViewingAnn(ann)} style={{ cursor: 'pointer' }}>
                                <div className="card-top">
                                    <span className={`badge-type ${ann.type}`}>{ann.type}</span>
                                    <div className="action-btns" onClick={(e) => e.stopPropagation()}>
                                        <button className="btn-edit" onClick={() => handleEdit(ann)}><Edit3 size={16} /></button>
                                        <button onClick={() => handleDelete(ann._id)} className="btn-delete"><Trash2 size={16} /></button>
                                    </div>
                                </div>

                                <h3 className="card-title">{ann.title}</h3>
                                <p className="card-content">{ann.content}</p>

                                <div className="card-meta-info">
                                    <div className="meta-row">
                                        <Calendar size={14} />
                                        <span>Expires: {ann.expiresAt ? new Date(ann.expiresAt).toLocaleDateString() : "No Expiry"}</span>
                                    </div>
                                    <div className="meta-row">
                                        <Users size={14} />
                                        {ann.target === "specificStudents" ? (
                                            <span className="badge-stu">{ann.targetIds?.length} Selected Students</span>
                                        ) : (
                                            <span className="badge-all">ِAll Students</span>
                                        )}
                                    </div>
                                    <div className="meta-row" style={{ marginTop: '4px', fontWeight: '500' }}>
                                        <span className="date-text">Created: {new Date(ann.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div className="no-data">No announcements match your criteria.</div>
            )}

            {/* Form Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h3>{editingAnn ? "Edit Announcement" : "Create New Announcement"}</h3>
                            <button className="close-btn" onClick={() => { setIsModalOpen(false); setIsDropdownOpen(false); }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-main-layout">
                                {!editingAnn && (
                                    <div className="form-right student-selection-area">
                                        <label><UserCheck size={16} /> Target Recipient</label>
                                        <div className="custom-multiselect">
                                            <div className={`dropdown-trigger ${isDropdownOpen ? 'open' : ''}`} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                                                <span>
                                                    {formData.target === "advisingList"
                                                        ? "All Students List (Default)"
                                                        : `${formData.studentsIds.length} Student(s) Selected`}

                                                </span>
                                                <ChevronDown size={18} />
                                            </div>

                                            {isDropdownOpen && (
                                                <div className="dropdown-panel">
                                                    <div className="dropdown-search">
                                                        <Search size={14} />
                                                        <input
                                                            type="text"
                                                            placeholder="Search student name or ID..."
                                                            value={studentSearch}
                                                            onChange={(e) => setStudentSearch(e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div className="dropdown-options">
                                                        {myStudents
                                                            .filter(student =>
                                                                student.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                                                student.id.toLowerCase().includes(studentSearch.toLowerCase())
                                                            )
                                                            .map(student => (
                                                                <div
                                                                    key={student.id}
                                                                    className={`option-item ${formData.studentsIds.includes(student.id) ? 'selected' : ''}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleStudentSelection(student.id);
                                                                    }}
                                                                >
                                                                    <div className="check-box">
                                                                        {formData.studentsIds.includes(student.id) && <Check size={12} />}
                                                                    </div>
                                                                    <div className="option-info">
                                                                        <p>{student.studentName}</p>
                                                                        <span>{student.id}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        {myStudents.filter(student =>
                                                            student.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                                            student.id.toLowerCase().includes(studentSearch.toLowerCase())
                                                        ).length === 0 && (
                                                                <div className="no-results">No students found</div>
                                                            )}
                                                    </div>
                                                    <div className="dropdown-footer">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFormData({ ...formData, studentsIds: [] });
                                                            }}
                                                        >
                                                            Clear All
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-1"
                                                            onClick={() => {
                                                                setIsDropdownOpen(false);
                                                                setStudentSearch("");
                                                            }}
                                                        >
                                                            Done
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <p className="selection-hint">Leave empty to send to your entire advising list.</p>
                                    </div>
                                )}
                                <div className="form-left">
                                    <div className="form-group">
                                        <label>Title</label>
                                        <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Registration Deadline" />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Type</label>
                                            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                                {types.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Expiry Date</label>
                                            <input type="date" value={formData.expiresAt} onChange={e => setFormData({ ...formData, expiresAt: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Message Content</label>
                                        <textarea required rows="5" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} placeholder="Write your message here..." />
                                    </div>
                                </div>

                                <div className="modal-foot">
                                    <button type="button" className="btn-cancel" onClick={() => { setIsModalOpen(false); setIsDropdownOpen(false); }}>Cancel</button>
                                    <button type="submit" disabled={submitting} className="btn-1">
                                        {submitting ? "Processing..." : editingAnn ? "Update" : "Publish Now"}
                                    </button>
                                </div>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* Details Drawer */}
            {viewingAnn && (
                <div className="details-drawer-overlay" onClick={() => setViewingAnn(null)}>
                    <div className="details-drawer" onClick={(e) => e.stopPropagation()}>
                        <div className="drawer-header">
                            <div className="drawer-title-area">
                                <span className={`badge-type ${viewingAnn.type}`}>{viewingAnn.type}</span>
                                <h3>Announcement Details</h3>
                            </div>
                            <button className="close-drawer-btn" onClick={() => setViewingAnn(null)}><X size={20} /></button>
                        </div>

                        <div className="drawer-content">
                            <div className="detail-group">
                                <label>Title</label>
                                <p className="detail-value title">{viewingAnn.title}</p>
                            </div>

                            <div className="detail-group">
                                <label>Content</label>
                                <p className="detail-value content-full">{viewingAnn.content}</p>
                            </div>

                            <div className="detail-row-grid">
                                <div className="detail-group">
                                    <label><Calendar size={14} /> Published</label>
                                    <p className="detail-value">{new Date(viewingAnn.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="detail-group">
                                    <label><Calendar size={14} /> Expiry Date</label>
                                    <p className="detail-value">{viewingAnn.expiresAt ? new Date(viewingAnn.expiresAt).toLocaleDateString() : "Permanent"}</p>
                                </div>
                            </div>

                            <div className="detail-group">
                                <label><Users size={14} /> Audience</label>
                                <div className="audience-info">
                                    {viewingAnn.target !== "specificStudents" ? (
                                        <span className="badge-all">Sent to All Students</span>
                                    ) : (
                                        <div className="specific-students-list">
                                            <p className="sub-label">Selected Students ({viewingAnn.targetIds?.length}):</p>
                                            <div className="students-chips-container">
                                                {viewingAnn.targetIds?.map(stdId => {
                                                    const student = myStudents.find(s => s.id === stdId);
                                                    return (
                                                        <div key={stdId} className="student-detail-chip">
                                                            <User size={12} />
                                                            <div className="std-info">
                                                                <span className="std-name">{student?.studentName || "Student"}</span>
                                                                <span className="std-id">{stdId}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="drawer-footer">
                            <button className="btn-1" onClick={() => { handleEdit(viewingAnn); setViewingAnn(null); }}>
                                <Edit3 size={16} /> Edit Announcement
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvisingAnnouncements;