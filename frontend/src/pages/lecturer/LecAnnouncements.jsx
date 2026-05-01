import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    Megaphone, Plus, Search, Edit3, Trash2,
    Calendar, ArrowUpRight, TrendingUp, X,
    LayoutGrid, List, Check, ChevronDown, User, Filter, Users, XCircle
} from "lucide-react";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import swalService from "../../services/swal";
import api from "../../services/api";
import "../styles/Announcements.css";

const LecAnnouncements = () => {
    // --- States ---
    const [layout, setLayout] = useState("table");
    const [announcements, setAnnouncements] = useState([]);
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [totalFilterId, setTotalFilterId] = useState("all");

    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editingAnn, setEditingAnn] = useState(null);
    const [viewMode, setViewMode] = useState("week");
    const [viewingAnn, setViewingAnn] = useState(null);

    // States for Enhanced Student Dropdown
    const [studentSearch, setStudentSearch] = useState("");
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const [formData, setFormData] = useState({
        title: "",
        content: "",
        type: "general",
        target: "course",
        targetIds: [],
        expiresAt: "",
        courseId: ""
    });

    const types = ["general", "urgent", "event", "deadline", "warning"];

    const getDateKey = (date) => {
        if (!date) return "";
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    };

    // 1. Fetch Courses
    const fetchCourses = async () => {
        try {
            const res = await api.get("/lecturers/me/courses");
            const coursesData = Array.isArray(res.data) ? res.data : [];
            setCourses(coursesData);
            if (coursesData.length > 0) {
                setSelectedCourseId(coursesData[0]._id);
            }
        } catch (err) {
            console.error("Error fetching courses:", err);
        }
    };

    // 2. Fetch Announcements
    const fetchAnnouncements = async () => {
        if (!selectedCourseId) return;
        try {
            setLoading(true);
            const res = await api.get(`/lecturers/me/courses/${selectedCourseId}/announcements`);
            setAnnouncements(Array.isArray(res.data) ? res.data : (res.data.data || []));
        } catch (err) {
            console.error("Error fetching announcements:", err);
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    // 3. Fetch Students for specific course
    const fetchCourseStudents = async (courseId) => {
        if (!courseId) return;
        try {
            const courseCode = courses.find(c => c._id === courseId)?.courseId?.courseCode || courseId.split('-')[0];
            const res = await api.get(`/semester-work/course/${courseCode}`);
            setStudents(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Error fetching students:", err);
            setStudents([]);
        }
    };

    useEffect(() => {
        fetchCourses();

        // Handle clicks outside dropdown to close it
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsStudentDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        fetchAnnouncements();
        fetchCourseStudents(selectedCourseId);
    }, [selectedCourseId]);

    useEffect(() => {
        if (formData.courseId) {
            fetchCourseStudents(formData.courseId);
        }
    }, [formData.courseId]);

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

            return matchesSearch && matchesDate && matchesType;
        });
    }, [announcements, searchTerm, dateFilter, typeFilter]);

    const displayTotalCount = useMemo(() => {
        if (totalFilterId === "all") return announcements.length;
        return announcements.filter(a => a.courseId === totalFilterId).length;
    }, [announcements, totalFilterId]);

    const filteredStudents = useMemo(() => {
        return students.filter(s =>
            s.studentId?.studentName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
            s.studentId?._id?.toString().includes(studentSearch)
        );
    }, [students, studentSearch]);

    const handleEdit = (ann) => {
        setEditingAnn(ann);
        setFormData({
            title: ann.title,
            content: ann.content,
            type: ann.type || "general",
            target: ann.target || "course",
            targetIds: ann.targetIds || [],
            expiresAt: ann.expiresAt ? getDateKey(ann.expiresAt) : "",
            courseId: ann.courseId || selectedCourseId
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const result = await swalService.confirm("Delete Announcement?", "This action cannot be undone.");
        if (result.isConfirmed) {
            try {
                await api.delete(`/lecturers/me/courses/${id}/announcements`);
                swalService.success("Deleted!", "Announcement removed.");
                fetchAnnouncements();
            } catch (err) { swalService.error("Error", "Failed to delete."); }
        }
    };

    const toggleStudentSelection = (id) => {
        setFormData(prev => {
            const ids = prev.targetIds.includes(id)
                ? prev.targetIds.filter(item => item !== id)
                : [...prev.targetIds, id];
            return { ...prev, targetIds: ids };
        });
    };

    const removeStudent = (id) => {
        setFormData(prev => ({
            ...prev,
            targetIds: prev.targetIds.filter(item => item !== id)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        try {
            setSubmitting(true);
            if (editingAnn) {
                await api.put(`/lecturers/me/courses/${editingAnn._id}/announcements`, formData);
                swalService.success("Updated", "Announcement updated successfully");
            } else {
                await api.post(`/lecturers/me/courses/${formData.courseId}/announcements`, formData);
                swalService.success("Sent", "Announcement published successfully");
            }
            setIsModalOpen(false);
            fetchAnnouncements();
            setFormData({ title: "", content: "", type: "general", target: "course", targetIds: [], expiresAt: "", courseId: "" });
        } catch (err) {
            swalService.error("Save Error", err.response?.data?.message || "Failed to save.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="management-container advising-ann-container">
            {/* Header */}
            <div className="page-header-section">
                <div className="prereg-header">
                    <h2>Course Announcements
                        <select
                            className="course-selector-header"
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            style={{ marginLeft: '15px', background: '#f1f3f8', color: '#3d3f37', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px' }}
                        >
                            {courses.map(c => (
                                <option key={c._id} value={c._id}>{c.courseId?.courseName || c._id}</option>
                            ))}
                        </select>
                    </h2>
                </div>
                <button className="btn-1" onClick={() => {
                    setEditingAnn(null);
                    setFormData({ title: "", content: "", type: "general", target: "course", targetIds: [], expiresAt: "", courseId: selectedCourseId });
                    setIsModalOpen(true);
                }}>
                    <Plus size={18} /> New Announcement
                </button>
            </div>

            {/* Insights Section */}
            <div className="insights-grid">
                <div className="stat-card">
                    <div className="stat-icon"><Megaphone size={24} /></div>
                    <div className="stat-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h3>{displayTotalCount}</h3>
                            <select
                                value={totalFilterId}
                                onChange={(e) => setTotalFilterId(e.target.value)}
                                className="insight-select"
                                style={{ padding: '2px 4px', fontSize: '12px', borderRadius: '4px', border: '1px solid #e2e8f0', outline: 'none' }}
                            >
                                <option value="all">All</option>
                                {courses.map(c => <option key={c._id} value={c._id}>{c.courseId?.courseName}</option>)}
                            </select>
                        </div>
                        <p>Total Announcements</p>
                    </div>
                    <div className="stat-trend positive"><ArrowUpRight size={14} /> Active</div>
                </div>

                <div className="chart-card">
                    <div className="chart-header">
                        <h4><TrendingUp size={16} /> Posting Activity</h4>
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

            {/* Filters Bar */}
            <div className="filters-bar-modern">
                <div className="filters-upper-row">
                    {/* <div className="search-box-modern">
                        <Search size={18} />
                        <input type="text" placeholder="Search in content..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div> */}

                    <div className="filter-group-horizontal">
                        <div className="filter-item">
                            <Filter size={16} />
                            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                                <option value="all">All Types</option>
                                {types.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                            </select>
                        </div>

                        <div className="filter-item date" >
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
                {/* Fixed filter-summary error by removing non-existent targetFilter */}
                <div className="filter-summary" style={{
                    display: 'flex', gap: '10px', justifyContent: 'center'
                }}>
                    Showing <strong>{filteredData.length}</strong> announcements
                    {(typeFilter !== "all" || dateFilter) && " based on your filters"}
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading course data...</p>
                </div>
            ) : (
                layout === "table" ? (
                    <div className="table-wrapper">
                        <table className="advising-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Target</th>
                                    <th>Content Preview</th>
                                    <th>Expiry</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length > 0 ? (
                                    filteredData.map(ann => (
                                        <tr key={ann._id} onClick={() => setViewingAnn(ann)} style={{ cursor: 'pointer' }}>
                                            <td style={{ fontWeight: '600' }}>{ann.title}</td>
                                            <td><span className={`badge-type ${ann.type}`}>{ann.type}</span></td>
                                            <td>
                                                {ann.target === "specificStudents" ? (

                                                    <span className="badge-stu">
                                                        <Users size={12} style={{ marginRight: '4px' }} />
                                                        {ann.targetIds?.length} Students
                                                    </span>
                                                ) : (
                                                    <span className="badge-all">Whole Course</span>
                                                )}
                                            </td>
                                            <td className="content-cell">
                                                {ann.content.length > 50 ? `${ann.content.substring(0, 50)}...` : ann.content}
                                            </td>
                                            <td>{ann.expiresAt ? new Date(ann.expiresAt).toLocaleDateString() : "Permanent"}</td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div className="action-btns">
                                                    <button onClick={() => handleEdit(ann)} className="btn-edit"><Edit3 size={18} /></button>
                                                    <button onClick={() => handleDelete(ann._id)} className="btn-delete"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6">
                                            <div className="empty-table-state">
                                                <p>No announcements found for this course.</p>
                                                <button
                                                    className="btn-text"
                                                    onClick={() => {
                                                        setEditingAnn(null);
                                                        setFormData({ title: "", content: "", type: "general", target: "course", targetIds: [], expiresAt: "", courseId: selectedCourseId });
                                                        setIsModalOpen(true);
                                                    }}
                                                >
                                                    Create your first announcement
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="announcements-grid">
                        {filteredData.length > 0 ? (
                            filteredData.map(ann => (
                                <div key={ann._id} className={`announcement-card border-${ann.type}`} onClick={() => setViewingAnn(ann)} style={{ cursor: 'pointer' }}>
                                    <div className="card-top">
                                        <span className={`badge-type ${ann.type}`}>{ann.type}</span>
                                        <div className="action-btns" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => handleEdit(ann)} className="btn-edit"><Edit3 size={16} /></button>
                                            <button onClick={() => handleDelete(ann._id)} className="btn-delete"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <h3 className="card-title">{ann.title}</h3>
                                    <p className="card-content">{ann.content.length > 100 ? `${ann.content.substring(0, 100)}...` : ann.content}</p>
                                    <div className="card-meta-info">
                                        <div className="meta-row">
                                            <Users size={14} />
                                            {ann.target === "specificStudents" ? (
                                                <span className="badge-stu">{ann.targetIds?.length} Selected Students</span>
                                            ) : (
                                                <span className="badge-all">Whole Course</span>
                                            )}
                                        </div>
                                        <div className="meta-row">
                                            <Calendar size={14} />
                                            <span>Expires: {ann.expiresAt ? new Date(ann.expiresAt).toLocaleDateString() : "No Expiry"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="grid-empty-state">
                                <p>No announcements to display</p>
                                <span>Try adjusting your filters or select another course.</span>
                            </div>
                        )}
                    </div>
                )
            )}

            {/* Details Drawer (قائمة التفاصيل الجانبية) */}
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
                                    {viewingAnn.target === "course" ? (
                                        <span className="badge-all">Sent to All Course Students</span>
                                    ) : (
                                        <div className="specific-students-list">
                                            <p className="sub-label">Selected Students ({viewingAnn.targetIds?.length}):</p>
                                            <div className="students-chips-container">
                                                {viewingAnn.targetIds?.map(std => (
                                                    <div key={std._id || std.id} className="student-detail-chip">
                                                        <User size={12} />
                                                        <div className="std-info">
                                                            <span className="std-name">{std.studentName || "Student"}</span>
                                                            <span className="std-id">{std.id || std._id}</span>
                                                        </div>
                                                    </div>
                                                ))}
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


            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '850px', width: '90%' }}> {/* Expanded Width */}
                        <div className="modal-header">
                            <h3>{editingAnn ? "Edit Course Announcement" : "Create New Announcement"}</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Target Course</label>
                                <select
                                    required
                                    value={formData.courseId}
                                    onChange={e => setFormData({ ...formData, courseId: e.target.value })}
                                >
                                    <option value="">Select Course</option>
                                    {courses.map(c => (
                                        <option key={c._id} value={c._id}>{c.courseId?.courseName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Announcement Target</label>
                                <div className="target-toggle-btns" style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                    <button
                                        type="button"
                                        className={`btn-toggle ${formData.target === 'course' ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, target: 'course', targetIds: [] })}
                                        style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: formData.target === 'course' ? 'var(--primary-color)' : 'transparent', color: formData.target === 'course' ? '#fff' : 'var(--text-primary)', fontWeight: '500' }}
                                    >Whole Course</button>
                                    <button
                                        type="button"
                                        className={`btn-toggle ${formData.target === 'specificStudents' ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, target: 'specificStudents' })}
                                        style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: formData.target === 'specificStudents' ? 'var(--primary-color)' : 'transparent', color: formData.target === 'specificStudents' ? '#fff' : 'var(--text-primary)', fontWeight: '500' }}
                                    >Specific Students</button>
                                </div>
                            </div>

                            {/* Enhanced Searchable Dropdown for Students */}
                            {formData.target === 'specificStudents' && (
                                <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
                                    <label>Select Students (ID / Name)</label>

                                    {/* Selected Students Tags */}
                                    <div className="selected-students-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px', minHeight: formData.targetIds.length > 0 ? '35px' : '0' }}>
                                        {formData.targetIds.map(item => {

                                            const studentName = item.studentName || students.find(s => s.studentId?._id === item)?.studentId?.studentName || item;
                                            const studentId = item.id || item._id || item;

                                            return (
                                                <div key={studentId} style={{ /* styles */ }}>
                                                    <span>{studentName} ({studentId})</span>
                                                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeStudent(studentId)} />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div
                                        className="searchable-dropdown-trigger"
                                        onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', background: 'var(--bg-secondary)' }}
                                    >
                                        <span style={{ color: '#888', fontSize: '14px', }}>
                                            {formData.targetIds.length > 0 ? `Selected ${formData.targetIds.length} students` : "Click to search students..."}
                                        </span>
                                        <ChevronDown size={18} />
                                    </div>

                                    {isStudentDropdownOpen && (
                                        <div className="custom-dropdown-portal" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', marginTop: '5px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', padding: '10px' }}>
                                            <div className="search-box-modern" style={{ marginBottom: '10px' }}>
                                                <Search size={16} />
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Type name or student ID..."
                                                    value={studentSearch}
                                                    onChange={(e) => setStudentSearch(e.target.value)}
                                                />
                                            </div>
                                            <div className="students-list-scroll" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {filteredStudents.length > 0 ? (
                                                    filteredStudents.map(s => (
                                                        <div
                                                            key={s.studentId?._id}
                                                            onClick={() => toggleStudentSelection(s.studentId?._id)}
                                                            style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderRadius: '4px', background: formData.targetIds.includes(s.studentId?._id) ? 'rgba(58, 134, 255, 0.1)' : 'transparent', marginBottom: '2px' }}
                                                        >
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontSize: '14px', fontWeight: '500' }}>{s.studentId?.studentName}</span>
                                                                <span style={{ fontSize: '12px', color: '#888' }}>ID: {s.studentId?._id}</span>
                                                            </div>
                                                            {formData.targetIds.includes(s.studentId?._id) && <Check size={16} color="var(--primary-color)" />}
                                                        </div>
                                                    ))
                                                ) : <p style={{ textAlign: 'center', padding: '10px', color: '#888' }}>No students found</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="form-group">
                                <label>Announcement Title</label>
                                <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. The next lecture has been postponed" />
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
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
                                <textarea required rows="5" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} placeholder="Write your detailed announcement here..." />
                            </div>

                            <div className="modal-footer" style={{ marginTop: '20px' }}>
                                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" disabled={submitting} className="btn-1" style={{ minWidth: '160px' }}>
                                    {submitting ? "Processing..." : editingAnn ? "Update Announcement" : "Post Announcement"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LecAnnouncements;