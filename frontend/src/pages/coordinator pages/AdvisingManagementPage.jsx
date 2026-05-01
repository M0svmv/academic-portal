import React, { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import {
    Edit, UserPlus, ListPlus, UserCheck, Trash2,
    Loader2, PlusCircle, Edit3, X, Save, Search, Eye, ChevronDown,
    Users, AlertCircle, UserMinus, BarChart3
} from 'lucide-react';
import "../styles/AdvisingManagement.css";
import { useNavigate, useParams } from "react-router-dom";

const AdvisingManagementPage = () => {
    const navigate = useNavigate();
    const [advisors, setAdvisors] = useState([]);
    const [nonAdvisors, setNonAdvisors] = useState([]);
    const [allLists, setAllLists] = useState([]);
    const [unassignedStudents, setUnassignedStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const { role } = useParams();

    // States للتحكم في المودالات الجديدة
    const [isUnassignedModalOpen, setIsUnassignedModalOpen] = useState(false);
    const [isEmptyListsModalOpen, setIsEmptyListsModalOpen] = useState(false);

    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem("activeAdvisingTab") || "current-advisors";
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [studentSearch, setStudentSearch] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedAdvisorList, setSelectedAdvisorList] = useState(null);
    const [formData, setFormData] = useState({ _id: "", advisorId: "", selectedStudents: [] });

    useEffect(() => {
        loadData();
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        localStorage.setItem("activeAdvisingTab", activeTab);
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchAdvisors(),
                fetchNonAdvisors(),
                fetchAllAdvisingLists(),
                fetchUnassignedStudents()
            ]);
        } finally { setLoading(false); }
    };

    const fetchAdvisors = async () => {
        const res = await api.get("/advisors/");
        setAdvisors(res.data.advisors || []);
    };

    const handleViewStudents = (advisorId) => {
        navigate(`/staff/${role}/advising/details/${advisorId}`);
    };

    const fetchListForEdit = (list) => {
        setIsEditMode(true);
        setSelectedAdvisorList(list);
        setFormData({
            _id: list._id,
            advisorId: list.advisor?._id || "",
            selectedStudents: []
        });
        setIsModalOpen(true);
    };

    const fetchNonAdvisors = async () => {
        const res = await api.get("/advisors/non-advisors");
        setNonAdvisors(res.data.nonAdvisors || []);
    };

    const fetchAllAdvisingLists = async () => {
        const res = await api.get("/advisors/advising-lists/all");
        setAllLists(res.data || []);
    };

    const fetchUnassignedStudents = async () => {
        const res = await api.get("/advisors/advising-lists/unassigned-students");
        console.log("unass:", res)
        setUnassignedStudents(res.data || []);
    };

    const handleRemoveStudent = async (listId, studentId) => {
        if (!window.confirm("Are you sure you want to remove this student?")) return;
        try {
            await api.post("/advisors/remove-student", { _id: listId, studentId });
            setSelectedAdvisorList(prev => ({
                ...prev,
                students: prev.students.filter(item => item.student._id !== studentId),
                studentsCount: prev.studentsCount - 1
            }));
            fetchAllAdvisingLists();
            fetchUnassignedStudents();
        } catch (err) { alert("Failed to remove student"); }
    };

    const toggleStudentSelection = (studentId) => {
        setFormData(prev => {
            const isSelected = prev.selectedStudents.includes(studentId);
            return {
                ...prev,
                selectedStudents: isSelected
                    ? prev.selectedStudents.filter(id => id !== studentId)
                    : [...prev.selectedStudents, studentId]
            };
        });
    };

    const handleSave = async () => {
        if (!formData._id || !formData.advisorId) {
            return alert("Please ensure List ID and Advisor are selected");
        }
        setLoading(true);
        try {
            if (!isEditMode) await api.post("/advisors/list", { _id: formData._id });
            await api.post("/advisors/assign", { _id: formData._id, advisorId: formData.advisorId });
            if (formData.selectedStudents.length > 0) {
                await api.post("/advisors/assign-students", {
                    _id: formData._id,
                    students: formData.selectedStudents.map(id => ({ student: id }))
                });
            }
            setIsModalOpen(false);
            setStudentSearch("");
            setFormData({ _id: "", advisorId: "", selectedStudents: [] });
            await loadData();
            alert("List updated successfully!");
        } catch (err) {
            alert(err.response?.data?.message || "Operation failed");
        } finally { setLoading(false); }
    };

    const stats = {
        totalAdvisors: advisors.length,
        unassignedStudents: unassignedStudents.length,
        emptyLists: allLists.filter(l => l.studentsCount === 0).length,
        staffAvailable: nonAdvisors.length
    };

    // 1. Filter for Current Advisors
    const filteredAdvisors = advisors.filter(a =>
        (a.staffName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (a._id?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    // 2. Filter for Advising Lists
    const filteredLists = allLists.filter(list =>
        (list.advisor?.staffName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (list._id?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    // 3. Filter for Non-Advisors (Available Staff)
    const filteredNonAdvisors = nonAdvisors.filter(staff =>
        (staff.staffName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (staff._id?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );


    const filteredUnassignedStudents = unassignedStudents.filter(s => {
        const studentId = s.studentId?._id;

        return (
            (
                (s.studentId?.studentName?.toLowerCase() || "").includes(studentSearch.toLowerCase()) ||
                (studentId?.toLowerCase() || "").includes(studentSearch.toLowerCase())
            ) &&
            !formData.selectedStudents.includes(studentId)
        );
    });

    return (
        <div className="management-container advising-container">
            <header className="advising-header">
                <div>
                    <h2>Advising Management</h2>
                </div>
            </header>

            {/* --- INSIGHTS CARDS SECTION --- */}
            <div className="insights-grid">
                <div className="insight-card clickable" onClick={() => setActiveTab("current-advisors")}>
                    <div className="insight-header">
                        <div className="insight-icon blue"><UserCheck size={18} /></div>
                        <span className="insight-label">Total Advisors</span>
                    </div>
                    <div className="insight-value">{stats.totalAdvisors}</div>
                    <div className="insight-footer">Active Advisors</div>
                </div>

                <div className="insight-card clickable" onClick={() => navigate(`/staff/${role}/advising/unassigned`)}>
                    <div className="insight-header">
                        <div className="insight-icon orange"><AlertCircle size={18} /></div>
                        <span className="insight-label">Unassigned Students</span>
                    </div>
                    <div className="insight-value">{stats.unassignedStudents}</div>
                    <div className="insight-footer">Click to manage students</div>
                </div>

                <div className="insight-card clickable" onClick={() => setIsEmptyListsModalOpen(true)}>
                    <div className="insight-header">
                        <div className="insight-icon red">
                            <ListPlus size={18} />
                        </div>
                        <span className="insight-label">Empty Lists</span>
                    </div>
                    <div className="insight-value">{stats.emptyLists}</div>
                    <div className="insight-footer">with no students</div>
                </div>

                <div className="insight-card clickable" onClick={() => setActiveTab("promote")}>
                    <div className="insight-header">
                        <div className="insight-icon green"><Users size={18} /></div>
                        <span className="insight-label">Available Staff</span>
                    </div>
                    <div className="insight-value">{stats.staffAvailable}</div>
                    <div className="insight-footer">To be Advisors</div>
                </div>
            </div>

            <div className="upperTable">
                <div className="advising-tabs">
                    <button className={activeTab === "current-advisors" ? "active" : ""} onClick={() => setActiveTab("current-advisors")}>
                        <UserCheck size={18} /> Advisors List
                    </button>
                    <button className={activeTab === "manage-lists" ? "active" : ""} onClick={() => setActiveTab("manage-lists")}>
                        <ListPlus size={18} /> Manage Lists
                    </button>
                    <button className={activeTab === "promote" ? "active" : ""} onClick={() => setActiveTab("promote")}>
                        <PlusCircle size={18} /> Add Advisor
                    </button>
                </div>

                <div className="header-actions">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by advisor name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="advising-content">
                {activeTab === "current-advisors" && (
                    <div className="table-wrapper">
                        <table className="advising-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Advisor Name</th>
                                    <th>Email</th>
                                    <th>Contact</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAdvisors.length > 0 ? filteredAdvisors.map(adv => (
                                    <tr key={adv._id}>
                                        <td className="course-id-cell">{adv._id}</td>
                                        <td style={{ fontWeight: '600', color: 'var( --primary-blue-color)' }}>{adv.staffName}</td>
                                        <td>{adv.email}</td>
                                        <td>{adv.phone}</td>
                                        <td>
                                            <button onClick={() => handleViewStudents(adv._id)} title="View Students" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                                <Eye size={18} color="#3a86ff" />
                                            </button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="5" className="text-center">No advisors found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "manage-lists" && (
                    <div className="manageLists">
                        <div className="table-header-actions">
                            <button className="btn-1 creat_new_list" onClick={() => {
                                setIsEditMode(false);
                                setSelectedAdvisorList(null);
                                setFormData({ _id: "", advisorId: "", selectedStudents: [] });
                                setIsModalOpen(true);
                            }}>
                                <PlusCircle size={16} /> Create New List
                            </button>
                        </div>
                        <div className="table-wrapper">
                            <table className="advising-table">
                                <thead>
                                    <tr>
                                        <th>List ID</th>
                                        <th>Assigned Advisor</th>
                                        <th>Students Count</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLists.length > 0 ? filteredLists.map(list => (
                                        <tr key={list._id}>
                                            <td className="course-id-cell">{list._id}</td>
                                            <td style={{ fontWeight: '600', color: 'var( --primary-blue-color)' }}>{list.advisor?.staffName || <span className="text-muted">Unassigned</span>}</td>
                                            <td><span className="badge">{list.studentsCount} Students</span></td>
                                            <td>
                                                <button className="btn-edit" onClick={() => fetchListForEdit(list)}>
                                                    <Edit size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan="4" className="text-center">No advising lists found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "promote" && (
                    <div className="table-wrapper">
                        <table className="advising-table">
                            <thead>
                                <tr>
                                    <th>Staff ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredNonAdvisors.length > 0 ? filteredNonAdvisors.map(staff => (
                                    <tr key={staff._id}>
                                        <td className="course-id-cell">{staff._id}</td>
                                        <td style={{ fontWeight: '600', color: 'var( --primary-blue-color)' }}>{staff.staffName}</td>
                                        <td>{staff.email}</td>
                                        <td>
                                            <button
                                                className="btn-delete"
                                                title="Make Advisor"
                                                onClick={() => api.post("/advisors/advisor", { _id: staff._id }).then(loadData)}
                                                style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer' }}
                                            >
                                                <UserPlus size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="4" className="text-center">No staff members available to promote.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* --- MODAL 1: View Students Table --- */}
            {isViewModalOpen && selectedAdvisorList && (
                <div className="modal-overlay">
                    <div className="modal-content modal-large">
                        <div className="modal-header">
                            <div>
                                <h3>Students Assigned to: {selectedAdvisorList.advisor?.staffName}</h3>
                                <p className="subtitle">List ID: {selectedAdvisorList._id} | Total: {selectedAdvisorList.studentsCount}</p>
                            </div>
                            <button className="close-btn" onClick={() => setIsViewModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body-ad">
                            <div className="table-wrapper">
                                <table className="advising-table">
                                    <thead>
                                        <tr>
                                            <th>Student ID</th>
                                            <th>Student Name</th>
                                            <th style={{ textAlign: 'right' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedAdvisorList.students.map(item => (
                                            <tr key={item.student._id}>
                                                <td>{item.student._id}</td>
                                                <td><strong>{item.student.studentName}</strong></td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        className="btn-delete"
                                                        title="Remove from list"
                                                        onClick={() => handleRemoveStudent(selectedAdvisorList._id, item.student._id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {selectedAdvisorList.students.length === 0 && (
                                            <tr>
                                                <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                    No students assigned to this list.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-outline-sm" onClick={() => setIsViewModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 2: Create/Edit List --- */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{isEditMode ? `Manage List: ${formData._id}` : "Create New List"}</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body-ad">
                            <div className="form-group">
                                <label>List ID</label>
                                <input type="text" disabled={isEditMode} value={formData._id} onChange={e => setFormData({ ...formData, _id: e.target.value })} placeholder="Enter List ID" />
                            </div>
                            <div className="form-group">
                                <label>Advisor</label>
                                <select value={formData.advisorId} onChange={e => setFormData({ ...formData, advisorId: e.target.value })}>
                                    <option value="">Select Advisor</option>
                                    {advisors.map(a => <option key={a._id} value={a._id}>{a.staffName}</option>)}
                                </select>
                            </div>

                            <div className="student-selection-section">
                                <div className="form-group" style={{ position: 'relative', marginBottom: '15px' }} ref={dropdownRef}>
                                    <div className="searchable-dropdown-input" onClick={() => setIsDropdownOpen(true)}>
                                        <div className="icon_placeholder">
                                            <Search size={16} className="search-icon" />
                                            <input
                                                className="input_drop"
                                                type="text"
                                                placeholder="Add student by name or ID..."
                                                value={studentSearch}
                                                onChange={(e) => {
                                                    setStudentSearch(e.target.value);
                                                    setIsDropdownOpen(true);
                                                }}
                                                onFocus={() => setIsDropdownOpen(true)}
                                            />
                                        </div>
                                        <ChevronDown size={16} className={`arrow-icon ${isDropdownOpen ? 'rotate' : ''}`} />
                                    </div>

                                    {isDropdownOpen && (
                                        <div className="dropdown-results shadow-lg">
                                            {filteredUnassignedStudents.length > 0 ? (
                                                filteredUnassignedStudents.map(s => (
                                                    <div
                                                        key={s._id}
                                                        className="dropdown-item"
                                                        onClick={() => {
                                                            toggleStudentSelection(s.studentId._id);
                                                            setStudentSearch("");
                                                            setIsDropdownOpen(false);
                                                        }}
                                                    >
                                                        <div className="item-info">
                                                            <span className="name">{s.studentId.studentName}</span>
                                                            <span className="id">#{s.studentId._id}</span>
                                                        </div>
                                                        <PlusCircle size={14} className="add-icon" />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="no-results">No unassigned students found.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="selected-students-table-wrapper" style={{
                                    maxHeight: '180px',
                                    overflowY: 'auto',
                                    background: '#fff',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <table className="advising-table" style={{ margin: 0, fontSize: '13px' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                                            <tr>
                                                <th style={{ padding: '8px 12px' }}>Student</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.selectedStudents.map(id => {
                                                const student = unassignedStudents.find(s => s.studentId?._id === id);
                                                return (
                                                    <tr key={id}>
                                                        <td style={{ padding: '6px 12px' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontWeight: '500' }}>
                                                                    {student?.studentId.studentName || 'Unknown'}
                                                                </span>
                                                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                                    #{student?.studentId._id}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                                                            <button
                                                                onClick={() => {
                                                                    toggleStudentSelection(id); // ✅ FIXED
                                                                }}
                                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {formData.selectedStudents.length === 0 && (
                                                <tr>
                                                    <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                                                        No students selected yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <span className="selected-count">{formData.selectedStudents.length} selected</span>
                            <button className="btn-1" onClick={handleSave} disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                {isEditMode ? "Update List" : "Create List"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- NEW MODAL: Empty Lists Insights --- */}
            {isEmptyListsModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Empty Advising Lists</h3>
                            <button className="close-btn" onClick={() => setIsEmptyListsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body-ad">
                            <div className="table-wrapper">
                                <table className="advising-table">
                                    <thead>
                                        <tr>
                                            <th>List ID</th>
                                            <th>Advisor</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allLists.filter(l => l.studentsCount === 0).length > 0 ?
                                            allLists.filter(l => l.studentsCount === 0).map(list => (
                                                <tr key={list._id}>
                                                    <td className="course-id-cell">{list._id}</td>
                                                    <td>{list.advisor?.staffName || "No Advisor"}</td>
                                                    <td>
                                                        <button className="btn-edit" onClick={() => {
                                                            setIsEmptyListsModalOpen(false);
                                                            fetchListForEdit(list);
                                                        }}>
                                                            <Edit size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>No empty lists found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvisingManagementPage;