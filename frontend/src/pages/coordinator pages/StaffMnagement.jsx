import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import swalService from "../../services/swal";
import {
    Plus, ChevronDown, FileUp, Trash2, Edit, Search, BookOpen, RotateCcw,
    UserCheck, Users, ShieldCheck, Phone, Mail, AlertTriangle, Scale, FileSpreadsheet
    , Loader2
} from 'lucide-react';
import StaffAddModal from '../../components/StaffAddModal';
import StaffEditModal from '../../components/StaffEditModal';
import StaffCSVModal from '../../components/StaffCSVModal';
import '../styles/ProgramCourses.css';

const VALID_ROLES = ["admin", "coordinator", "academic-advisor", "lecturer", "ta"];

const ROLE_COLORS = {
    admin: "#fee2e2",
    coordinator: "#e0f2fe",
    "academic-advisor": "#fef3c7",
    lecturer: "#f0fdf4",
    ta: "#f5f3ff"
};

const StaffManagement = () => {
    const [staff, setStaff] = useState([]);
    const [search, setSearch] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
    const [filterRole, setFilterRole] = useState('');

    const [roleView, setRoleView] = useState('all');
    const [teachingView, setTeachingView] = useState('all');
    const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
    const [showMultiRoleOnly, setShowMultiRoleOnly] = useState(false);

    const fetchStaff = async () => {
        try {
            const res = await api.get("/staff");
            setStaff(res.data);
        } catch (err) {
            console.error("Error fetching staff:", err);
        }
    };

    useEffect(() => { fetchStaff(); }, []);

    const handleRoleViewChange = (val) => {
        setRoleView(val);
        setShowIncompleteOnly(false);
        setShowMultiRoleOnly(false);
        setTeachingView('all');

        if (val === 'all') {
            setFilterRole('');
        } else if (val === 'admin') {
            setFilterRole('admin');
        } else if (val === 'coordinator') {
            setFilterRole('coordinator');
        } else if (val === 'advisor') {
            setFilterRole('academic-advisor');
        }
    };


    const handleTeachingViewChange = (val) => {
        setTeachingView(val);
        setShowIncompleteOnly(false);
        setShowMultiRoleOnly(false);
        setRoleView('all');

        if (val === 'all') {
            setFilterRole('teaching-all');
        } else if (val === 'lecturer') {
            setFilterRole('lecturer');
        } else if (val === 'ta') {
            setFilterRole('ta');
        }
    };


    const handleMainRoleFilterChange = (val) => {
        setFilterRole(val);
        if (val === '') {
            setRoleView('all');
            setTeachingView('all');
        } else if (['admin', 'coordinator', 'academic-advisor'].includes(val)) {
            setTeachingView('all');
            if (val === 'admin') setRoleView('admin');
            if (val === 'coordinator') setRoleView('coordinator');
            if (val === 'academic-advisor') setRoleView('advisor');
        } else if (['lecturer', 'ta'].includes(val)) {
            setRoleView('all');
            if (val === 'lecturer') setTeachingView('lecturer');
            if (val === 'ta') setTeachingView('ta');
        }
    };

    const getRoleCardValue = () => {
        if (roleView === 'all') return staff.length;
        if (roleView === 'admin') return staff.filter(s => s.roles.includes('admin')).length;
        if (roleView === 'coordinator') return staff.filter(s => s.roles.includes('coordinator')).length;
        if (roleView === 'advisor') return staff.filter(s => s.roles.includes('academic-advisor')).length;
        return 0;
    };

    const getTeachingCardValue = () => {
        const teachingTotal = staff.filter(s => s.roles.includes('lecturer') || s.roles.includes('ta'));
        if (teachingView === 'all') return teachingTotal.length;
        if (teachingView === 'lecturer') return staff.filter(s => s.roles.includes('lecturer')).length;
        if (teachingView === 'ta') return staff.filter(s => s.roles.includes('ta')).length;
        return 0;
    };


    const incompleteStaffList = staff.filter(s => !s.email || !s.phone);
    const contactabilityRate = staff.length > 0
        ? Math.round(((staff.length - incompleteStaffList.length) / staff.length) * 100)
        : 100;

    // 4. حساب Multi-Role (Workload)
    const multiRoleCount = staff.filter(s => s.roles.length > 1).length;

    const openAddModal = () => setIsAddModalOpen(true);
    const openEditModal = (member) => { setEditingStaff(member); setIsEditModalOpen(true); };
    const openCSVModal = () => setIsCSVModalOpen(true);

    const handleAddStaff = async (staffData) => {
        try {
            swalService.showLoading("Adding staff member...");
            await api.post("/staff", staffData);
            setIsAddModalOpen(false);
            fetchStaff();
            swalService.success("Success", "Staff member has been added to the system.");
        } catch (err) {
            console.error(err);
            swalService.error("Add Failed", err.response?.data?.message || "Could not add staff member.");
        }
    };

    const handleCSVUpload = async (staffList) => {
        try {
            swalService.showLoading("Importing staff list...");
            await api.post("/staff/list", staffList);
            setIsCSVModalOpen(false);
            fetchStaff();
            swalService.success("Import Successful", `${staffList.length} members imported.`);
        } catch (err) {
            console.error(err);
            swalService.error("Import Error", "Check your CSV format and ensure IDs are unique.");
        }
    };

    const deleteStaff = async (id) => {
        const result = await swalService.confirm(
            "Remove Staff Member?",
            "This action cannot be undone and may affect assigned courses or students.",
            "Yes, Remove Member",
            "warning"
        );

        if (result.isConfirmed) {
            try {
                swalService.showLoading("Removing...");
                await api.delete(`/staff/${id}`);
                swalService.success("Removed", "Member has been deleted successfully.", 1500);
                fetchStaff();
            } catch (err) {
                console.error(err);
                swalService.error("Delete Failed", "This member might be linked to active academic records.");
            }
        }
    };

    const filteredStaff = staff.filter(s => {
        const matchesSearch = (
            s.staffName?.toLowerCase().includes(search.toLowerCase()) ||
            s._id?.toLowerCase().includes(search.toLowerCase()) ||
            s.email?.toLowerCase().includes(search.toLowerCase())
        );

        let matchesRole = true;
        if (filterRole === 'teaching-all') {
            matchesRole = s.roles.includes('lecturer') || s.roles.includes('ta');
        } else if (filterRole) {
            matchesRole = s.roles.includes(filterRole);
        }

        const matchesIncomplete = showIncompleteOnly ? (!s.email || !s.phone) : true;
        const matchesMultiRole = showMultiRoleOnly ? s.roles.length > 1 : true;

        return matchesSearch && matchesRole && matchesIncomplete && matchesMultiRole;
    });

    const handleResetAllFilters = () => {
        setSearch('');
        setFilterRole('');
        setRoleView('all');
        setTeachingView('all');
        setShowIncompleteOnly(false);
        setShowMultiRoleOnly(false);
    };

    const handleExportReport = () => {
        if (filteredStaff.length === 0) {
            swalService.error("No Data", "There is no data to export with the current filters.");
            return;
        }

        const csvRows = [];
        const headers = ["Staff ID", "Name", "Email", "Phone", "Username", "Roles"];
        csvRows.push(headers.join(","));

        filteredStaff.forEach(member => {
            const row = [
                member._id,
                `"${member.staffName}"`,
                member.email || "N/A",
                member.phone || "N/A",
                member.username,
                `"${member.roles.join(", ")}"`
            ];
            csvRows.push(row.join(","));
        });

        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Staff_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const inlineSelectStyle = {
        border: 'none', background: 'none', fontSize: '14px', fontWeight: 'bold',
        cursor: 'pointer', appearance: 'none', paddingRight: '15px', color: 'var( --primary-blue-color)',
        textDecoration: 'underline'
    };

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="prereg-header">
                    <h2>Staff Management</h2>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn-2"
                        onClick={handleExportReport}
                    >
                        <FileSpreadsheet size={18} /> Export CSV
                    </button>

                    <div className="split-button-container">
                        <button className="main-add-btn" onClick={openAddModal}>
                            <Plus size={18} /> Add Staff
                        </button>
                        <button className="dropdown-toggle-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                            <ChevronDown size={18} />
                        </button>
                        {dropdownOpen && (
                            <div className="split-dropdown-menu">
                                <button className="dropdown-item" onClick={() => { openAddModal(); setDropdownOpen(false); }}>
                                    <Plus size={14} /> Add Individual
                                </button>
                                <button className="dropdown-item" onClick={() => { openCSVModal(); setDropdownOpen(false); }}>
                                    <FileUp size={14} /> CSV Import
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="insights-grid">
                <div
                    className={`insight-card ${filterRole && ['admin', 'coordinator', 'academic-advisor'].includes(filterRole) ? 'active-filter' : ''}`}
                    style={{
                        cursor: 'pointer',
                        border: filterRole && ['admin', 'coordinator', 'academic-advisor'].includes(filterRole) ? '2px solid #0284c7' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                    onClick={() => {
                        if (roleView === 'all') {
                            handleRoleViewChange('admin');
                        } else {
                            handleRoleViewChange(roleView);
                        }
                    }}
                >
                    <div className="insight-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="insight-icon icon-blue"><Users size={18} /></span>
                        <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                            <select
                                value={roleView}
                                onChange={(e) => handleRoleViewChange(e.target.value)}
                                style={inlineSelectStyle}
                            >
                                <option value="all">Total Staff</option>
                                <option value="admin">Administrators</option>
                                <option value="coordinator">Coordinators</option>
                                <option value="advisor">Academic Advisors</option>
                            </select>
                            <ChevronDown size={12} style={{ position: 'absolute', right: 0, top: '4px', pointerEvents: 'none' }} />
                        </div>
                    </div>
                    <div className="insight-value" style={{ fontSize: '1.75rem', marginTop: '10px' }}>
                        {getRoleCardValue()}
                    </div>
                    <div className="insight-footer" style={{ marginTop: '10px', color: '#64748b' }}>
                        Management Roles
                    </div>
                </div>

                <div
                    className={`insight-card ${filterRole === 'teaching-all' || ['lecturer', 'ta'].includes(filterRole) ? 'active-filter' : ''}`}
                    style={{
                        cursor: 'pointer',
                        border: filterRole === 'teaching-all' || ['lecturer', 'ta'].includes(filterRole) ? '2px solid #22c55e' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                    onClick={() => {
                        handleTeachingViewChange(teachingView);
                    }}
                >
                    <div className="insight-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="insight-icon icon-green"><BookOpen size={18} /></span>
                        <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                            <select
                                value={teachingView}
                                onChange={(e) => handleTeachingViewChange(e.target.value)}
                                style={inlineSelectStyle}
                            >
                                <option value="all">Teaching Staff</option>
                                <option value="lecturer">Lecturers</option>
                                <option value="ta">TAs</option>
                            </select>
                            <ChevronDown size={12} style={{ position: 'absolute', right: 0, top: '4px', pointerEvents: 'none' }} />
                        </div>
                    </div>
                    <div className="insight-value" style={{ fontSize: '1.75rem', marginTop: '10px' }}>
                        {getTeachingCardValue()}
                    </div>
                    <div className="insight-footer" style={{ marginTop: '10px', color: '#64748b' }}>
                        Academic Staff
                    </div>
                </div>

                <div
                    className={`insight-card ${showIncompleteOnly ? 'active-filter' : ''}`}
                    onClick={() => {
                        setShowIncompleteOnly(!showIncompleteOnly);
                        setShowMultiRoleOnly(false);
                        setFilterRole('');
                    }}
                    style={{ cursor: 'pointer', border: showIncompleteOnly ? '2px solid #ef4444' : 'none', transition: 'all 0.2s ease' }}
                >
                    <div className="insight-header">
                        <span className="insight-icon icon-orange"><Mail size={18} /></span>
                        <span className="insight-label">Contactability</span>
                    </div>
                    <div className="insight-value" style={{ fontSize: '1.75rem', marginTop: '10px', color: contactabilityRate < 100 ? '#ef4444' : '#22c55e' }}>
                        {contactabilityRate}%
                    </div>
                    <div className="insight-footer" style={{ marginTop: '10px', color: '#64748b' }}>
                        {incompleteStaffList.length > 0 ? `${incompleteStaffList.length} Missing Info` : 'All Data Valid'}
                    </div>
                </div>

                <div
                    className={`insight-card ${showMultiRoleOnly ? 'active-filter' : ''}`}
                    onClick={() => {
                        setShowMultiRoleOnly(!showMultiRoleOnly);
                        setShowIncompleteOnly(false);
                        setFilterRole('');
                    }}
                    style={{
                        cursor: 'pointer',
                        border: showMultiRoleOnly ? '2px solid #a855f7' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <div className="insight-header">
                        <span className="insight-icon icon-purple"><UserCheck size={18} /></span>
                        <span className="insight-label">Workload Alert</span>
                    </div>
                    <div className="insight-value" style={{ fontSize: '1.75rem', marginTop: '10px', color: showMultiRoleOnly ? '#a855f7' : 'inherit' }}>
                        {multiRoleCount} Members
                    </div>
                    <div className="insight-footer" style={{ marginTop: '10px', color: '#64748b' }}>
                        {showMultiRoleOnly ? "Filtering Multi-roles" : "Holding multiple roles"}
                    </div>
                </div>
            </div>


            <div className="filters-wrapper">
                <Search size={22} color="#9ca3af" />
                <input
                    className="search-input"
                    type="text"
                    placeholder="Search by ID, Name, or Email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select
                    value={filterRole === 'teaching-all' ? '' : filterRole}
                    onChange={e => handleMainRoleFilterChange(e.target.value)}
                >
                    <option value="">All Roles</option>
                    {VALID_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
            {(showIncompleteOnly || showMultiRoleOnly || filterRole || search) && (
                <div className="filter-active-bar" style={{
                    background: showIncompleteOnly ? '#fef2f2' : (showMultiRoleOnly ? '#faf5ff' : '#f0fdf4'),
                    border: `1px solid ${showIncompleteOnly ? '#fee2e2' : (showMultiRoleOnly ? '#f3e8ff' : '#dcfce7')}`,
                    padding: '10px', borderRadius: '8px', marginBottom: '15px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <span style={{ color: showIncompleteOnly ? '#991b1b' : (showMultiRoleOnly ? '#7e22ce' : '#166534'), fontSize: '14px', fontWeight: '500' }}>
                        {showIncompleteOnly && "Showing staff with missing contact details only."}
                        {showMultiRoleOnly && "Showing staff with high workload (multiple roles)."}
                        {(!showIncompleteOnly && !showMultiRoleOnly && filterRole) && `Showing staff with role: "${filterRole === 'teaching-all' ? 'Lecturers & TAs' : filterRole}".`}
                        {(!showIncompleteOnly && !showMultiRoleOnly && !filterRole && search) && `Showing results matching search: "${search}".`}
                    </span>

                    <button
                        onClick={handleResetAllFilters}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'transparent',
                            border: 'none',
                            color: showIncompleteOnly ? '#ef4444' : (showMultiRoleOnly ? '#a855f7' : '#22c55e'),
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginLeft: 'auto',
                            padding: '2px 6px'
                        }}
                    >
                        <RotateCcw size={14} /> Reset View
                    </button>
                </div>
            )}

            <div className="table-wrapper">
                <table className="management-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Staff Name</th>
                            <th>Contact Info</th>
                            <th>Username</th>
                            <th>Roles</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStaff.map(member => (
                            <tr key={member._id}>
                                <td className="course-id-cell">{member._id}</td>
                                <td>
                                    <div style={{ fontWeight: '600', color: 'var( --primary-blue-color)' }}>{member.staffName}</div>
                                </td>
                                <td>
                                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: !member.email ? '#ef4444' : 'inherit' }}>
                                            <Mail size={12} /> {member.email || "Missing email"}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: !member.phone ? '#ef4444' : '#64748b' }}>
                                            <Phone size={12} /> {member.phone || "Missing phone"}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ color: '#64748b', fontSize: '14px' }}>@{member.username}</td>
                                <td>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {member.roles.map(role => (
                                            <span key={role} className="type-badge" style={{ backgroundColor: ROLE_COLORS[role] || "#eee", color: "var( --primary-blue-color)", border: "1px solid rgba(0,0,0,0.05)" }}>
                                                {role}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="action-btns">
                                        <button className="btn-icon btn-edit" onClick={() => openEditModal(member)}>
                                            <Edit size={18} />
                                        </button>
                                        <button className="btn-icon btn-delete" onClick={() => deleteStaff(member._id)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredStaff.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                                    No staff members found matching the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {isAddModalOpen && (
                <StaffAddModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={handleAddStaff}
                />
            )}

            {isEditModalOpen && editingStaff && (
                <StaffEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingStaff(null);
                    }}
                    staffId={editingStaff._id}
                    onUpdate={() => {
                        fetchStaff();
                        setIsEditModalOpen(false);
                        setEditingStaff(null);
                        swalService.success("Updated", "Staff profile has been updated.", 1500);
                    }}
                />
            )}

            {isCSVModalOpen && (
                <StaffCSVModal
                    isOpen={isCSVModalOpen}
                    onClose={() => setIsCSVModalOpen(false)}
                    onUploadSuccess={handleCSVUpload}
                />
            )}
        </div>
    );
};

export default StaffManagement;