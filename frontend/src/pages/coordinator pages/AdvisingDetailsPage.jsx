import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import swalService from "../../services/swal";
import {
    FaArrowLeft, FaSearch
} from "react-icons/fa";
import {
    Trash2, UserCheck, Eye, GraduationCap,
    BookOpen, Target, AlertTriangle, Filter
    , Loader2
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
    const [atRiskFilter, setAtRiskFilter] = useState("all");
    const [actionLoading, setActionLoading] = useState(false);

    const fetchDetails = async () => {
        try {
            const res = await api.get(`/advisors/${advisorId}/advisors/advising-lists`);
            setData(res.data);

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
        <div
            className="management-container"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '80vh',
                flexDirection: 'column',
                gap: '14px'
            }}
        >
            <Loader2
                size={42}
                style={{
                    animation: 'spin 1s linear infinite',
                    color: '#2563eb'
                }}
            />
            <h3>Loading Advisor Details...</h3>
        </div>
    );

    if (!data) return <div className="error-container">No data found.</div>;

    const { advisor, students, studentsCount } = data;

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

    // ---------------- CAPACITY LOGIC ----------------
    const getCapacityDetails = (count) => {
        const total = count || 0;
        if (total < 10) {
            return { text: "Low", color: "#3b82f6" }; // Blue
        } else if (total <= 25) {
            return { text: "Normal", color: "#10b981" }; // Green
        } else {
            return { text: "High", color: "#f97316" }; // Orange/Red
        }
    };

    const capacity = getCapacityDetails(studentsCount);

    const filterSelectStyle = {
        padding: '10px 14px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        fontSize: '14px',
        fontWeight: '500',
        color: '#475569',
        outline: 'none',
        cursor: 'pointer',
        minWidth: '140px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s'
    };

    return (
        <div className="management-container" style={{ padding: '30px', backgroundColor: '#fdfdfd' }}>

            {/* HEADER */}
            <header className="advising-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button
                        className="back-btn-round"
                        onClick={() => navigate(-1)}

                    >
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{advisor?.staffName}</h2>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                            <span className="badge-info" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>ID: {advisor?._id}</span>
                            <span className="badge-secondary" style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>Academic Advisor</span>
                        </div>
                    </div>
                </div>

                <div className="academic-profile-card" style={{ padding: '12px 24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="insight-icon blue" style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <UserCheck size={20} />
                        </div>
                        <div>
                            <p style={{ fontSize: '11px', fontWeight: '500', color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Email</p>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '2px 0 0 0' }}>{advisor?.email}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* INSIGHT CARDS */}
            <div className="insights-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div className="insight-card" style={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div className="insight-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div className="insight-icon orange" style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}><GraduationCap size={18} /></div>
                        <span className="insight-label" style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Total Students</span>
                    </div>
                    <div className="insight-value" >{studentsCount || 0}</div>
                </div>

                <div className="insight-card" style={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div className="insight-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div className="insight-icon green" style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}><BookOpen size={18} /></div>
                        <span className="insight-label" style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Active Filters</span>
                    </div>
                    <div className="insight-value" >{filteredStudents?.length}</div>
                </div>

                <div className="insight-card" style={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div className="insight-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div className="insight-icon blue" style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}><Target size={18} /></div>
                        <span className="insight-label" style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Advisor Capacity</span>
                    </div>
                    <div className="insight-value" style={{ color: capacity.color }}>{capacity.text}</div>
                </div>

                <div className="insight-card" style={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div className="insight-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div className="insight-icon red" style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}><AlertTriangle size={18} /></div>
                        <span className="insight-label" style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Total At Risk</span>
                    </div>
                    <div className="insight-value" style={{ color: atRiskCount > 0 ? '#ef4444' : '#0f172a' }}>
                        {atRiskCount}
                    </div>
                </div>
            </div>

            {/* SEARCH & FILTERS BAR */}
            <div className="upperTable" style={{ display: 'flex', gap: '20px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div className="search-box" style={{
                    flex: 1,
                    minWidth: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    border: '1px solid #e2e8f0',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#fff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <FaSearch size={16} color="#94a3b8" />
                    <input
                        placeholder="Search by student name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#0f172a' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
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
                            color: atRiskFilter === 'risk' ? '#ef4444' : '#475569',
                            fontWeight: atRiskFilter === 'risk' ? '600' : '500',
                            borderColor: atRiskFilter === 'risk' ? '#fecaca' : '#e2e8f0',
                            backgroundColor: atRiskFilter === 'risk' ? '#fef2f2' : '#fff'
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
                <div className="table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
                    <table className="advising-table" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#1e293b', color: '#fff', textAlign: 'left' }}>
                                <th style={{ padding: '16px 20px', fontWeight: '600', fontSize: '14px' }}>ID</th>
                                <th style={{ padding: '16px 20px', fontWeight: '600', fontSize: '14px' }}>Full Name</th>
                                <th style={{ padding: '16px 20px', fontWeight: '600', fontSize: '14px' }}>Academic Progress</th>
                                <th style={{ padding: '16px 20px', fontWeight: '600', fontSize: '14px' }}>Level & Reg.</th>
                                <th style={{ padding: '16px 20px', fontWeight: '600', fontSize: '14px' }}>Credits</th>
                                <th style={{ padding: '16px 20px', fontWeight: '600', fontSize: '14px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents?.length > 0 ? (
                                filteredStudents.map(item => (
                                    <tr key={item.student?._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }} className="table-row-hover">
                                        <td className="course-id-cell" style={{ padding: '16px 20px', fontSize: '14px', color: '#64748b', fontWeight: '500' }}>#{item.student?._id}</td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '15px' }}>{item.student?.studentName}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{item.student?.studentEmail}</div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className="badge-info" style={{ background: '#f0f9ff', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontSize: '13px' }}>
                                                    GPA: <strong>{item.student?.transcript?.GPA}</strong>
                                                </span>
                                                {item.student?.transcript?.atRisk && (
                                                    <span className="badge-red" style={{ fontSize: '11px', padding: '4px 8px', color: '#ef4444', backgroundColor: '#fef2f2', borderRadius: '6px', fontWeight: '600' }}>At Risk</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <span className="badge-secondary" style={{ marginRight: '5px', backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', textTransform: 'capitalize' }}>{item.student?.transcript?.level}</span>
                                            <span className="badge-info" style={{ fontSize: '12px', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '4px 8px', borderRadius: '6px', fontWeight: '500' }}>{item.student?.transcript?.regulation}</span>
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#334155', fontWeight: '500' }}>{item.student?.transcript?.completedCredits} hrs</td>
                                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                                <button
                                                    className="btn-view"
                                                    onClick={() => navigate(`/staff/${role}/students/${item.student?._id}`)}
                                                    title="View Profile"

                                                >
                                                    <Eye size={18} color="#3b82f6" />
                                                </button>
                                                <button
                                                    className="btn-delete"

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
                                            <p style={{ margin: 0, fontSize: '15px', fontWeight: '500' }}>No students match the current filters or list is empty.</p>
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