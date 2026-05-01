import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import Cookies from "js-cookie";
import api from '../../services/api';
import swalService from "../../services/swal";
import {
    Plus, ChevronDown, FileUp, Trash2, Edit, Search,
    Users, AlertTriangle, Star, Eye, Scale, FileSpreadsheet
} from 'lucide-react';

import StudentAddModal from '../../components/StudentAddModal';
import StudentEditModal from '../../components/StudentEditModal';
import StudentCSVModal from '../../components/StudentCSVModal';

import '../styles/ProgramCourses.css';
import "../styles/Students.css";

const Students = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
    const [unassignedStudents, setUnassignedStudents] = useState([]);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterLevel, setFilterLevel] = useState('');
    const [filterReg, setFilterReg] = useState('');

    const [cardLevelView, setCardLevelView] = useState('all');
    const [cardRegView, setCardRegView] = useState('all');

    const token = Cookies.get("token");
    const navigate = useNavigate();
    const { role } = useParams();

    const fetchStudents = async () => {
        try {
            const res = await api.get("/transcripts", {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(res)
            const data = res.data?.data || res.data || [];
            setStudents(data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching students:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
        fetchUnassignedStudents();
    }, []);

    const fetchUnassignedStudents = async () => {
        try {
            const res = await api.get("/advisors/advising-lists/unassigned-students");
            console.log(res);
            setUnassignedStudents(res.data || []);
        } catch (err) {
            console.error("Error fetching unassigned:", err);
        }
    };

    const getCardValue = () => {
        if (cardLevelView === 'all') return students.length;
        return students.filter(s => s.level === cardLevelView).length;
    };
    const getRegCardValue = () => {
        if (cardRegView === 'all') return students.length;
        return students.filter(s => s.regulation === cardRegView).length;
    };

    const filteredStudents = students.filter(s => {
        const searchLower = search.toLowerCase();
        const studentObj = s.studentId || {};
        const name = (studentObj.studentName || "").toLowerCase();
        const id = (studentObj._id || "").toLowerCase();
        const email = (studentObj.studentEmail || "").toLowerCase();

        const matchesSearch = name.includes(searchLower) || id.includes(searchLower) || email.includes(searchLower);

        // التعديل هنا: نتحقق إذا كان الطالب موجود في قائمة الـ unassignedStudents
        const isUnassigned = unassignedStudents.some(un => un.studentId._id === studentObj._id);

        const matchesStatus = filterStatus === '' ||
            (filterStatus === 'atRisk' ? s.atRisk :
                filterStatus === 'noAdvisor' ? isUnassigned : !s.atRisk);

        const matchesLevel = filterLevel === '' || s.level === filterLevel;
        const matchesReg = filterReg === '' || s.regulation === filterReg;

        return matchesSearch && matchesStatus && matchesLevel && matchesReg;
    });

    const handleAddStudent = async (studentData) => {
        try {
            swalService.showLoading("Adding student...");
            await api.post("/students", studentData);
            setIsAddModalOpen(false);
            fetchStudents();
            fetchUnassignedStudents();
            swalService.success("Success", "Student added successfully!");
        } catch (err) {
            swalService.error("Error", err.response?.data?.message || "Error adding student");
        }
    };

    const handleCSVUpload = async (studentList) => {
        try {
            const result = await swalService.confirm(
                "Import Students?",
                `You are about to import ${studentList.length} students. Proceed?`,
                "Yes, Import"
            );

            if (result.isConfirmed) {
                swalService.showLoading("Importing records...");
                const formattedList = studentList.map(s => ({
                    _id: s.academicId,
                    studentName: s.studentName,
                    username: s.username,
                    password: s.password,
                    studentPhone: s.studentPhone,
                    studentEmail: s.studentEmail,
                }));

                await api.post("/students/list", formattedList);
                setIsCSVModalOpen(false);
                fetchStudents();
                fetchUnassignedStudents();
                swalService.success("Imported!", "All students have been added to the system.");
            }
        } catch (err) {
            swalService.error("Import Failed", err.response?.data?.message || "Error importing CSV");
        }
    };

    const deleteStudent = async (id) => {
        const result = await swalService.confirm(
            "Are you sure?",
            "This will permanently delete the student and their academic history.",
            "Yes, Delete"
        );

        if (result.isConfirmed) {
            try {
                swalService.showLoading("Deleting...");
                await api.delete(`/students/${id}`);
                fetchStudents();
                fetchUnassignedStudents();
                swalService.success("Deleted", "Student record has been removed.");
            } catch (err) {
                swalService.error("Error", err.message || "Could not delete student");
            }
        }
    };

    const handleExportReport = () => {
        if (filteredStudents.length === 0) {
            swalService.error("No Data", "There is no data to export with the current filters.");
            return;
        }

        const csvRows = [];
        const headers = ["Student ID", "Name", "Email", "Level", "Regulation", "GPA", "Completed Credits", "Status"];
        csvRows.push(headers.join(","));

        filteredStudents.forEach(item => {
            const row = [
                item.studentId?._id,
                `"${item.studentId?.studentName}"`,
                item.studentId?.studentEmail || "N/A",
                item.level,
                item.regulation,
                item.GPA?.toFixed(2),
                item.completedCredits,
                item.atRisk ? "At Risk" : "Good Standing"
            ];
            csvRows.push(row.join(","));
        });

        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Students_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="prereg-header">
                    <h2>Students Management</h2>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn-2"
                        onClick={handleExportReport}
                    >
                        <FileSpreadsheet size={18} /> Export CSV
                    </button>

                    <div className="split-button-container">
                        <button className="main-add-btn" onClick={() => setIsAddModalOpen(true)}>
                            <Plus size={18} /> Add Student
                        </button>
                        <button className="dropdown-toggle-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                            <ChevronDown size={18} />
                        </button>
                        {dropdownOpen && (
                            <div className="split-dropdown-menu">
                                <button className="dropdown-item" onClick={() => { setIsAddModalOpen(true); setDropdownOpen(false); }}>
                                    <Plus size={14} /> Add Individual
                                </button>
                                <button className="dropdown-item" onClick={() => { setIsCSVModalOpen(true); setDropdownOpen(false); }}>
                                    <FileUp size={14} /> CSV Import
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {unassignedStudents.length > 0 && (
                <div className="unassigned-alert-banner">
                    <div className="alert-content">
                        <AlertTriangle size={20} className="alert-icon-pulse" />
                        <span>
                            <strong>Attention:</strong> There are <b>{unassignedStudents.length}</b> students without an assigned Academic Advisor.
                        </span>
                    </div>
                    <button
                        className="fix-now-btn"
                        onClick={() => setFilterStatus('noAdvisor')}
                    >
                        Show Now
                    </button>
                </div>
            )}

            <div className="insights-grid">
                <div className="insight-card university-stats">
                    <div className="insight-header">
                        <span className="insight-icon icon-blue"><Users size={18} /></span>
                        <div className="card-select-wrapper">
                            <select
                                className="inline-card-select"
                                value={cardLevelView}
                                onChange={(e) => setCardLevelView(e.target.value)}
                            >
                                <option value="all">Total Students</option>
                                <option value="freshman">Freshman</option>
                                <option value="sophomore">Sophomore</option>
                                <option value="junior">Junior</option>
                                <option value="senior">Senior</option>
                                <option value="senior-1">Senior 1</option>
                                <option value="senior-2">Senior 2</option>
                                <option value="graduated">Graduated</option>
                            </select>
                            <ChevronDown size={12} className="select-chevron" />
                        </div>
                    </div>
                    <div className="insight-value-large">{getCardValue()}</div>
                    <div className="insight-footer">Enrollment Status</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-orange"><AlertTriangle size={18} /></span>
                        <span className="insight-label">At Risk</span>
                    </div>
                    <div className="insight-value">{students.filter(s => s.atRisk).length}</div>
                    <div className="insight-footer">Requires attention</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-green"><Scale size={18} /></span>
                        <div className="card-select-wrapper">
                            <select
                                className="inline-card-select"
                                value={cardRegView}
                                onChange={(e) => setCardRegView(e.target.value)}
                            >
                                <option value="all">All Regulations</option>
                                <option value="New">New Regulation</option>
                                <option value="Old">Old Regulation</option>
                                <option value="last">Last Regulation</option>
                            </select>
                            <ChevronDown size={12} className="select-chevron" />
                        </div>
                    </div>
                    <div className="insight-value-large">{getRegCardValue()}</div>
                    <div className="insight-footer">System Distribution</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-green"><Star size={18} /></span>
                        <span className="insight-label">Average GPA</span>
                    </div>
                    <div className="insight-value">
                        {(students.reduce((sum, s) => sum + (s.GPA || 0), 0) / (students.length || 1)).toFixed(2)}
                    </div>
                    <div className="insight-footer">Overall performance</div>
                </div>
            </div>

            <div className="filters-wrapper">
                <div className="search-container">
                    <Search size={22} color="#9ca3af" />
                    <input
                        type="text"
                        placeholder="Search by ID, Name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <select value={filterReg} onChange={e => setFilterReg(e.target.value)} className="filter-select">
                    <option value="">All Regulations</option>
                    <option value="New">New Regulation</option>
                    <option value="Old">Old Regulation</option>
                    <option value="last">Last Regulation</option>
                </select>

                <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="filter-select">
                    <option value="">All Levels</option>
                    <option value="freshman">Freshman</option>
                    <option value="sophomore">Sophomore</option>
                    <option value="junior">Junior</option>
                    <option value="senior">Senior</option>
                    <option value="senior-1">Senior-1</option>
                    <option value="senior-2">Senior-2</option>
                    <option value="graduated">Graduated</option>
                </select>

                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
                    <option value="">All Status</option>
                    <option value="good">Good Standing</option>
                    <option value="atRisk">At Risk</option>
                    <option value="noAdvisor">No Advisor</option>
                </select>
            </div>

            {(filterReg || filterLevel || filterStatus || search) && (
                <div className="active-filters-bar">
                    <div className="filters-info">
                        <span>Showing results for: </span>
                        {search && <span className="filter-chip">Search: "{search}"</span>}
                        {filterReg && <span className="filter-chip">Reg: {filterReg}</span>}
                        {filterLevel && <span className="filter-chip">Level: {filterLevel}</span>}
                        {filterStatus && <span className="filter-chip">Status: {filterStatus}</span>}
                    </div>
                    <button className="reset-filters-link" onClick={() => {
                        setSearch('');
                        setFilterReg('');
                        setFilterLevel('');
                        setFilterStatus('');
                    }}>
                        Reset
                    </button>
                </div>
            )}

            <div className="table-wrapper">
                {loading ? <p>Loading...</p> : (
                    <table className="management-table">
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Student Name</th>
                                <th>Academic Details</th>
                                <th>Performance</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(student => (
                                <tr key={student._id}>
                                    <td className="course-id-cell">{student.studentId?._id}</td>
                                    <td>
                                        <div className="student-name-text">
                                            {student.studentId?.studentName}
                                        </div>
                                    </td>
                                    <td className="student-info-combined">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1e293b' }}>
                                                {student.regulation} Regulation
                                            </span>

                                            <span className="type-badge" style={{
                                                backgroundColor: '#e0f2fe',
                                                color: '#0369a1',
                                                fontSize: '0.75rem',
                                                padding: '2px 8px',
                                                width: 'fit-content',
                                                borderRadius: '4px'
                                            }}>
                                                {student.level}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="performance-info">
                                            <span style={{ fontWeight: 'bold', color: student.GPA < 2 ? '#dc2626' : 'inherit' }}>
                                                GPA: {student.GPA?.toFixed(2)}
                                            </span>
                                            <div className="credits-info">{student.completedCredits} Credits</div>
                                        </div>
                                    </td>
                                    <td>
                                        {student.atRisk
                                            ? <span className="type-badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>At Risk</span>
                                            : <span className="type-badge" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>Good</span>
                                        }
                                    </td>
                                    <td>
                                        <div className="action-btns">
                                            <button className="view-btn-transparent" title="View Profile"
                                                onClick={() => navigate(`/staff/${role}/students/${student.studentId?._id}`)}>
                                                <Eye size={18} color="#3a86ff" />
                                            </button>
                                            <button className="btn-icon btn-edit" title="Edit Student"
                                                onClick={() => { setEditingStudent(student); setIsEditModalOpen(true); }}>
                                                <Edit size={18} />
                                            </button>
                                            <button className="btn-icon btn-delete" title="Delete Student"
                                                onClick={() => deleteStudent(student.studentId?._id)}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                                        No student records found matching the current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {isAddModalOpen && (
                <StudentAddModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={handleAddStudent}
                />
            )}

            {isEditModalOpen && editingStudent && (
                <StudentEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => { setIsEditModalOpen(false); setEditingStudent(null); }}
                    studentId={editingStudent.studentId?._id}
                    studentRegulation={editingStudent.regulation}
                    transId={editingStudent._id}
                    onUpdate={() => { fetchStudents(); setIsEditModalOpen(false); setEditingStudent(null); }}
                />
            )}

            {isCSVModalOpen && (
                <StudentCSVModal
                    isOpen={isCSVModalOpen}
                    onClose={() => setIsCSVModalOpen(false)}
                    onUploadSuccess={handleCSVUpload}
                />
            )}
        </div>
    );
};

export default Students;