import React, { useState, useEffect, useMemo } from "react";
import {
    Megaphone, Users, Plus, Search, Edit3, Trash2,
    Calendar, Globe, ArrowUpRight, TrendingUp, X, User,
    LayoutGrid, List, UserCheck, ChevronDown, Check
} from "lucide-react";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import swalService from "../../services/swal";
import api from "../../services/api";

import "../styles/Announcements.css";


const Announcements = () => {
    const [activeTab, setActiveTab] = useState("department");
    const [layout, setLayout] = useState("table");
    const [announcements, setAnnouncements] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editingAnn, setEditingAnn] = useState(null);
    const [viewMode, setViewMode] = useState("week");
    const [advisingLists, setAdvisingLists] = useState([]);
    const [selectedAdvId, setSelectedAdvId] = useState("");
    const [viewingAnn, setViewingAnn] = useState(null);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [Students, setStudents] = useState([]);
    const [studentSearch, setStudentSearch] = useState("");

    // تم دمج الـ State هنا ومنع التكرار لضمان عمل الفورم بشكل صحيح
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        type: "general",
        expiresAt: "",
        studentsIds: []
    });

    const types = ["general", "urgent", "event", "deadline", "warning"];

    const getDateKey = (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    const fetchStudents = async () => {
        try {
            const res = await api.get("/transcripts");
            console.log(res.data)
            const data = res.data?.data || res.data || [];
            setStudents(data);
        } catch (err) {
            console.error("Error fetching students:", err);
        }
    };

    const fetchAdvisingLists = async () => {
        try {
            const res = await api.get("/advisors/advising-lists/all");
            setAdvisingLists(res.data);
            if (res.data.length > 0 && !selectedAdvId) {
                setSelectedAdvId(res.data[0]._id);
            }
        } catch (err) {
            console.error("Error fetching advising lists:", err);
        }
    };

    useEffect(() => {
        fetchStudents();
        if (activeTab === "advising") {
            fetchAdvisingLists();
        }
    }, [activeTab]);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            let res;
            if (activeTab === "department") {
                res = await api.get("/announcements/");
            } else {
                if (!selectedAdvId) {
                    setAnnouncements([]);
                    setLoading(false);
                    return;
                }
                res = await api.get(`/announcements/advising-list/${selectedAdvId}`);
            }
            setAnnouncements(res.data);
        } catch (err) {
            console.error("Error fetching data:", err);
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, [activeTab, selectedAdvId]);

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

    const toggleStudentSelection = (id) => {
        setFormData(prev => ({
            ...prev,
            studentsIds: prev.studentsIds.includes(id)
                ? prev.studentsIds.filter(sid => sid !== id)
                : [...prev.studentsIds, id]
        }));
    };

    const handleEdit = (ann) => {
        setEditingAnn(ann);
        setFormData({
            title: ann.title,
            content: ann.content,
            type: ann.type || "general",
            expiresAt: ann.expiresAt ? new Date(ann.expiresAt).toISOString().split('T')[0] : "",
            studentsIds: ann.targetIds || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const result = await swalService.confirm(
            "Delete Announcement?",
            "Are you sure you want to delete this announcement? This action cannot be undone."
        );

        if (result.isConfirmed) {
            try {
                await api.delete(`/announcements/${id}`);
                swalService.success("Deleted!", "Announcement has been removed.");
                fetchAnnouncements();
            } catch (err) {
                swalService.error("Error", "Failed to delete the announcement.");
                console.error(err);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        try {
            setSubmitting(true);
            const payload = {
                ...formData,
                target: activeTab === "department" ? "all" : (formData.studentsIds.length > 0 ? "specificStudents" : "advising")
            };

            if (editingAnn) {
                await api.put(`/announcements/${editingAnn._id}`, payload);
                swalService.success("Updated!", "Announcement updated successfully.");
            } else {
                await api.post("/announcements/", payload);
                swalService.success("Created!", "New announcement has been posted.");
            }

            setIsModalOpen(false);
            setEditingAnn(null);
            setFormData({ title: "", content: "", type: "general", expiresAt: "", studentsIds: [] });
            fetchAnnouncements();
        } catch (err) {
            swalService.error("Save Error", err.response?.data?.message || "Something went wrong while saving.");
            console.error("Save Error:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredData = useMemo(() => {
        return announcements.filter((ann) => {
            const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase());
            const annDate = ann.createdAt ? getDateKey(ann.createdAt) : "";
            const matchesDate = dateFilter ? annDate === dateFilter : true;
            return matchesSearch && matchesDate;
        });
    }, [announcements, searchTerm, dateFilter]);

    return (
        <div className="management-container advising-container">
            {/* Header */}
            <div className="page-header-section">
                <div className="prereg-header">
                    <h2>Announcements</h2>
                </div>
                <button className="btn-1" onClick={() => {
                    setEditingAnn(null);
                    setFormData({ title: "", content: "", type: "general", expiresAt: "", studentsIds: [] });
                    setIsModalOpen(true);
                }}>
                    <Plus size={18} /> Create New
                </button>
            </div>

            {/* Insights Section */}
            <div className="insights-grid">
                <div className="stat-card">
                    <div className="stat-icon"><Megaphone size={24} /></div>
                    <div className="stat-info">
                        <h3>{announcements.length}</h3>
                        <p>Total Announcements</p>
                    </div>
                    <div className="stat-trend positive"><ArrowUpRight size={14} /> Active</div>
                </div>

                <div className="chart-card">
                    <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4><TrendingUp size={16} /> Activity Trend</h4>
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
                            <Tooltip
                                labelFormatter={(value, payload) => payload[0]?.payload?.fullDate || value}
                                formatter={(value) => [`${value} Announcements`, "Activity"]}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Area type="monotone" dataKey="posts" stroke="#3a86ff" strokeWidth={2} fillOpacity={1} fill="url(#colorPosts)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Tabs & Controls */}
            <div className="controls-row">
                <div className="advising-tabs">
                    <button className={activeTab === "department" ? "active" : ""} onClick={() => setActiveTab("department")}>
                        <Globe size={18} /> Department
                    </button>
                    <button className={activeTab === "advising" ? "active" : ""} onClick={() => setActiveTab("advising")}>
                        <Users size={18} /> Advising
                    </button>
                </div>

                <div className="filters-group">
                    {activeTab === "advising" && (
                        <div className="select-box-modern">
                            <Users size={18} />
                            <select
                                value={selectedAdvId}
                                onChange={(e) => setSelectedAdvId(e.target.value)}
                                className="adv-select"
                            >
                                <option value="">Select Advising List...</option>
                                {advisingLists.map(list => (
                                    <option key={list._id} value={list._id}>
                                        {list.advisor?.staffName || `List ${list._id}`} ({list.studentsCount} Students)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="date-filter-box">
                        <Calendar size={18} />
                        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                        {dateFilter && <X size={14} className="clear-date" onClick={() => setDateFilter("")} />}
                    </div>
                    <div className="layout-toggle">
                        <button className={layout === "table" ? "active" : ""} onClick={() => setLayout("table")} title="Table View">
                            <List size={20} />
                        </button>
                        <button className={layout === "grid" ? "active" : ""} onClick={() => setLayout("grid")} title="Cards View">
                            <LayoutGrid size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
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
                                        <td className="content-cell" style={{ fontWeight: '600' }}>{ann.title}</td>
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
                                            <span className="badge-all">All Students</span>
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
                <div className="no-data">No announcements found.</div>
            )}

            {/* Form Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h3>{editingAnn ? "Edit Announcement" : "Create New Announcement"}</h3>
                            <button className="close-btn" onClick={() => { setIsModalOpen(false); setIsDropdownOpen(false); }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-main-layout">
                                {!editingAnn && (
                                    <div className="form-right student-selection-area">
                                        <label><UserCheck size={16} /> Target Recipient</label>
                                        <div className="custom-multiselect-container">
                                            <div className={`dropdown-trigger ${isDropdownOpen ? 'open' : ''}`} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                                                <span>
                                                    {formData.studentsIds.length === 0
                                                        ? "All Students (Default)"
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
                                                        {Students
                                                            .filter(student => {
                                                                const name = student.studentId?.studentName?.toLowerCase() || "";
                                                                const id = student.studentId?._id?.toLowerCase() || "";
                                                                const search = studentSearch.toLowerCase();
                                                                return name.includes(search) || id.includes(search);
                                                            })
                                                            .map(student => {
                                                                const sId = student.studentId?._id;
                                                                const sName = student.studentId?.studentName;
                                                                if (!sId) return null;

                                                                return (
                                                                    <div
                                                                        key={sId}
                                                                        className={`option-item ${formData.studentsIds.includes(sId) ? 'selected' : ''}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleStudentSelection(sId);
                                                                        }}
                                                                    >
                                                                        <div className="check-box">
                                                                            {formData.studentsIds.includes(sId) && <Check size={12} />}
                                                                        </div>
                                                                        <div className="option-info">
                                                                            <p>{sName}</p>
                                                                            <span>{sId}</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        {Students.length === 0 && <div className="no-results">No students available</div>}
                                                    </div>
                                                    <div className="dropdown-footer">
                                                        <button
                                                            type="button"
                                                            className="btn-clear"
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
                                        <input
                                            required
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="e.g., Registration Deadline"
                                        />
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
                                        <textarea
                                            required
                                            rows="5"
                                            value={formData.content}
                                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                                            placeholder="Write your message here..."
                                        />
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
                                                    const student = Students.find(s => s.id === stdId);
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default Announcements;