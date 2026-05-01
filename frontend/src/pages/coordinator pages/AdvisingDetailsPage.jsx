import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import swalService from "../../services/swal";
import {
    FaArrowLeft, FaSearch
} from "react-icons/fa";
import {
    Trash2, UserCheck, Eye, GraduationCap,
    BookOpen, Target, AlertTriangle, Loader2, Filter
} from 'lucide-react';
import "../styles/AdvisingManagement.css";

const LEVELS = [
    "freshman", "sophomore", "junior", "senior",
    "senior-1", "senior-2", "graduated"
];

const REGULATIONS = ["Old", "last", "New"];

const AdvisingDetails = () => {
    const navigate = useNavigate();
    const { advisorId, role } = useParams();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLevel, setSelectedLevel] = useState("all");
    const [selectedRegulation, setSelectedRegulation] = useState("all");
    const [atRiskFilter, setAtRiskFilter] = useState("all"); // الفلتر الجديد للحالات الحرجة
    const [actionLoading, setActionLoading] = useState(false);

    const fetchDetails = async () => {
        try {
            const res = await api.get(`/advisors/${advisorId}/advisors/advising-lists`);
            setData(res.data);
            console.log('details', res.data)
        } catch (err) {
            console.error(err);
            swalService.error("Error", "Failed to load advisor details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [advisorId]);

    const handleRemoveStudent = async (studentId) => {
        if (!studentId) return;
        const result = await swalService.confirm(
            "Remove Student",
            "Are you sure you want to remove this student from this advisor's list?"
        );

        if (!result.isConfirmed) return;

        setActionLoading(true);
        try {
            await api.post("/advisors/remove-student", {
                _id: data._id,
                studentId
            });

            setData(prev => ({
                ...prev,
                students: prev.students.filter(item => item.student?._id !== studentId),
                studentsCount: prev.studentsCount - 1
            }));

            swalService.success("Removed!", "Student removed successfully.");
        } catch (err) {
            swalService.error("Error", err.response?.data?.message || "Something went wrong");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return (
        <div className="loading-state" style={{ height: '80vh' }}>
            <Loader2 className="animate-spin" size={40} />
            <p>Loading Advisor Details...</p>
        </div>
    );

    if (!data) return <div className="error-container">No data found.</div>;

    const { advisor, students, studentsCount } = data;

    // ---------------- FILTERING LOGIC ----------------
    const filteredStudents = students?.filter(item => {
        const s = item.student;
        const nameMatch = s?.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || s?._id?.includes(searchTerm);
        const levelMatch = selectedLevel === "all" || s?.transcript?.level === selectedLevel;
        const regMatch = selectedRegulation === "all" || s?.transcript?.regulation === selectedRegulation;

        const riskMatch = atRiskFilter === "all"
            ? true
            : atRiskFilter === "risk"
                ? s?.transcript?.atRisk === true
                : s?.transcript?.atRisk === false;

        return nameMatch && levelMatch && regMatch && riskMatch;
    });

    const atRiskCount = students?.filter(s => s.student?.transcript?.atRisk).length || 0;

    // Inline Styles for Filters
    const filterSelectStyle = {
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        fontSize: '14px',
        outline: 'none',
        cursor: 'pointer',
        minWidth: '130px'
    };

    return (
        <div className="management-container">

            {/* HEADER */}
            <header className="advising-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="back-btn-round" onClick={() => navigate(-1)}>
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h2>{advisor?.staffName}</h2>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <span className="badge-info">ID: {advisor?._id}</span>
                            <span className="badge-secondary">Academic Advisor</span>
                        </div>
                    </div>
                </div>

                <div className="academic-profile-card" style={{ padding: '10px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="insight-icon blue" style={{ width: '35px', height: '35px' }}><UserCheck size={18} /></div>
                        <div>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Contact Email</p>
                            <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>{advisor?.email}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* INSIGHT CARDS (Read Only Now) */}
            <div className="insights-grid" style={{ marginBottom: '25px' }}>
                <div className="insight-card">
                    <div className="insight-header">
                        <div className="insight-icon orange"><GraduationCap size={18} /></div>
                        <span className="insight-label">Total Students</span>
                    </div>
                    <div className="insight-value">{studentsCount || 0}</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <div className="insight-icon green"><BookOpen size={18} /></div>
                        <span className="insight-label">Active Filters</span>
                    </div>
                    <div className="insight-value">{filteredStudents?.length}</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <div className="insight-icon blue"><Target size={18} /></div>
                        <span className="insight-label">Advisor Capacity</span>
                    </div>
                    <div className="insight-value">Normal</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <div className="insight-icon red"><AlertTriangle size={18} /></div>
                        <span className="insight-label">Total At Risk</span>
                    </div>
                    <div className="insight-value" style={{ color: atRiskCount > 0 ? '#ef4444' : 'inherit' }}>
                        {atRiskCount}
                    </div>
                </div>
            </div>

            {/* SEARCH & FILTERS BAR */}
            <div className="upperTable" style={{ gap: '50px' }}>
                <div className="search-box" style={{ flex: 2, Width: '60%', }}>
                    <FaSearch size={16} />
                    <input
                        placeholder="Search by student name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* <Filter size={18} color="#64748b" /> */}

                    <select
                        style={filterSelectStyle}
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                    >
                        <option value="all">All Levels</option>
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>

                    <select
                        style={filterSelectStyle}
                        value={selectedRegulation}
                        onChange={(e) => setSelectedRegulation(e.target.value)}
                    >
                        <option value="all">All Regulations</option>
                        {REGULATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>

                    <select
                        style={{
                            ...filterSelectStyle,
                            color: atRiskFilter === 'risk' ? '#ef4444' : 'inherit',
                            fontWeight: atRiskFilter === 'risk' ? '600' : '400'
                        }}
                        value={atRiskFilter}
                        onChange={(e) => setAtRiskFilter(e.target.value)}
                    >
                        <option value="all">Status: All</option>
                        <option value="risk">At Risk</option>
                        <option value="safe">Safe</option>
                    </select>
                </div>
            </div>

            {/* TABLE */}
            <div className="advising-content">
                <div className="table-wrapper">
                    <table className="advising-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Full Name</th>
                                <th>Academic Progress</th>
                                <th>Level & Reg.</th>
                                <th>Credits</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents?.length > 0 ? (
                                filteredStudents.map(item => (
                                    <tr key={item.student?._id}>
                                        <td className="course-id-cell">#{item.student?._id}</td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{item.student?.studentName}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{item.student?.studentEmail}</div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className="badge-info" style={{ background: '#f0f9ff', color: '#0369a1' }}>
                                                    GPA: <strong>{item.student?.transcript?.GPA}</strong>
                                                </span>
                                                {item.student?.transcript?.atRisk && (
                                                    <span className="badge-red" style={{ fontSize: '10px', padding: '2px 6px', color: '#ef4444' }}>At Risk</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge-secondary" style={{ marginRight: '5px' }}>{item.student?.transcript?.level}</span>
                                            <span className="badge-info" style={{ fontSize: '11px' }}>{item.student?.transcript?.regulation}</span>
                                        </td>
                                        <td style={{ fontSize: '14px' }}>{item.student?.transcript?.completedCredits} hrs</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                                <button
                                                    className="view-btn-transparent"
                                                    title="View Profile"
                                                    onClick={() => navigate(`/staff/${role}/students/${item.student?._id}`)}
                                                >
                                                    <Eye size={18} color="#3b82f6" />
                                                </button>
                                                <button
                                                    className="btn-icon-action"
                                                    style={{ color: '#ef4444', borderColor: '#fee2e2' }}
                                                    title="Remove from List"
                                                    disabled={actionLoading}
                                                    onClick={() => handleRemoveStudent(item.student?._id)}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: "center", padding: "3rem", color: '#64748b' }}>
                                        <div className="no-results">
                                            <p>No students match the current filters or list is empty.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdvisingDetails;