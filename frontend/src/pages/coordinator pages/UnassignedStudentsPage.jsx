import React, { useState, useEffect } from "react";
import api from "../../services/api";
import swalService from "../../services/swal";
import {
    X, Search, Eye, Loader2,
    GraduationCap, BookOpen, Target, Filter,
    UserPlus, CheckCircle2, Info
} from 'lucide-react';
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/AdvisingManagement.css";

const LEVELS = ["freshman", "sophomore", "junior", "senior", "senior-1", "senior-2", "graduated"];
const REGULATIONS = ["Old", "last", "New"];

const UnassignedStudentsPage = () => {
    const navigate = useNavigate();
    const { role } = useParams();

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLevel, setSelectedLevel] = useState("all");
    const [selectedRegulation, setSelectedRegulation] = useState("all");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [advisors, setAdvisors] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedAdvisorId, setSelectedAdvisorId] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchUnassigned();
        fetchAdvisors();
    }, []);

    const fetchUnassigned = async () => {
        setLoading(true);
        try {
            const res = await api.get("/advisors/advising-lists/unassigned-students");
            setStudents(res.data || []);
        } catch (err) {
            swalService.error("Connection Error", "Failed to load unassigned students list.");
        } finally {
            setLoading(false);
        }
    };

    const fetchAdvisors = async () => {
        try {
            const res = await api.get("/advisors/advising-lists/all");
            setAdvisors(res.data || []);
        } catch (err) {
            console.error("Failed to fetch advisors");
        }
    };

    const handleAssign = async () => {
        if (!selectedAdvisorId || !selectedStudent) return;

        const confirm = await swalService.confirm(
            "Are you sure?",
            `You are about to assign ${selectedStudent.studentId?.studentName} to the selected list.`,
            "Yes, Assign"
        );

        if (!confirm.isConfirmed) return;

        setSubmitting(true);
        try {
            const payload = {
                _id: selectedAdvisorId,
                students: [{ student: selectedStudent.studentId?._id }]
            };

            await api.post("/advisors/assign-students", payload);
            await swalService.success("Assigned!", "The student has been successfully assigned.");

            setIsModalOpen(false);
            setSelectedAdvisorId("");
            fetchUnassigned();
        } catch (err) {
            swalService.error("Assignment Failed", err.response?.data?.message || "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredStudents = students.filter(s => {
        const name = s.studentId?.studentName?.toLowerCase() || "";
        const id = s.studentId?._id?.toLowerCase() || "";
        const matchesSearch = name.includes(searchTerm.toLowerCase()) || id.includes(searchTerm.toLowerCase());
        const matchesLevel = selectedLevel === "all" || s.level === selectedLevel;
        const matchesReg = selectedRegulation === "all" || s.regulation === selectedRegulation;
        return matchesSearch && matchesLevel && matchesReg;
    });

    // Inline styles for consistency
    const filterSelectStyle = {
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        fontSize: '14px',
        outline: 'none',
        cursor: 'pointer',
        minWidth: '150px'
    };

    return (
        <div className="management-container advising-container">
            {/* HEADER */}
            <header className="advising-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="back-btn-round" onClick={() => navigate(-1)}>
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h2>Unassigned Students</h2>

                    </div>
                </div>
            </header>

            {/* INSIGHT CARDS */}
            <div className="insights-grid" style={{ marginBottom: '25px' }}>
                <div className="insight-card">
                    <div className="insight-header">
                        <div className="insight-icon orange"><GraduationCap size={18} /></div>
                        <span className="insight-label">Waiting List</span>
                    </div>
                    <div className="insight-value">{students.length}</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <div className="insight-icon green"><BookOpen size={18} /></div>
                        <span className="insight-label">Filtered Results</span>
                    </div>
                    <div className="insight-value">{filteredStudents.length}</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <div className="insight-icon blue"><Target size={18} /></div>
                        <span className="insight-label">System Status</span>
                    </div>
                    <div className="insight-value" style={{ fontSize: '18px', color: '#059669' }}>Active</div>
                </div>
            </div>

            {/* SEARCH & FILTERS BAR */}
            <div className="upperTable" style={{ gap: '50px' }}>
                <div className="search-box" style={{ flex: 2, minWidth: '250px' }}>
                    <Search size={18} />
                    <input
                        placeholder="Search by name or student ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>


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
                </div>
            </div>

            {/* TABLE CONTENT */}
            <div className="advising-content">
                <div className="table-wrapper">
                    {loading ? (
                        <div className="loading-state" style={{ height: '40vh' }}>
                            <Loader2 className="animate-spin" size={40} color="var( --primary-blue-color)" />
                            <p>Fetching waiting list...</p>
                        </div>
                    ) : (
                        <table className="advising-table">
                            <thead>
                                <tr>
                                    <th>Student ID</th>
                                    <th>Full Name</th>
                                    <th>Academic Info</th>
                                    <th>Level & Reg.</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length > 0 ? filteredStudents.map(record => (
                                    <tr key={record._id}>
                                        <td className="course-id-cell">#{record.studentId?._id}</td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{record.studentId?.studentName}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{record.studentId?.studentEmail}</div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <span className="badge-info" style={{ background: '#f0f9ff', color: '#0369a1' }}>
                                                    GPA: <strong>{record.GPA}</strong>
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                                Credits: {record.completedCredits} hrs
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge-secondary" style={{ marginRight: '5px' }}>{record.level}</span>
                                            <span className="badge-info" style={{ fontSize: '11px' }}>{record.regulation}</span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                                <button
                                                    className="view-btn-transparent"
                                                    title="View Profile"
                                                    onClick={() => navigate(`/staff/${role}/students/${record.studentId?._id}`)}
                                                >
                                                    <Eye size={18} color="#3b82f6" />
                                                </button>
                                                <button
                                                    className="btn-icon-action"
                                                    style={{ color: '#059669', borderColor: '#d1fae5' }}
                                                    onClick={() => {
                                                        setSelectedStudent(record);
                                                        setIsModalOpen(true);
                                                    }}
                                                    title="Assign to Advisor"
                                                >
                                                    <FaPlus size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: "center", padding: "4rem" }}>
                                            <div style={{ color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                                <Info size={40} strokeWidth={1} />
                                                <p>No unassigned students found matching your criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ASSIGNMENT MODAL */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <UserPlus size={20} color="#0f172a" />
                                <h3 style={{ margin: 0 }}>Assign to Advisor</h3>
                            </div>
                            <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #3b82f6' }}>
                                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Student Selected:</p>
                                <p style={{ margin: 0, fontWeight: '600', color: 'var( --primary-blue-color)' }}>{selectedStudent?.studentId?.studentName} (#{selectedStudent?.studentId?._id})</p>
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                                    Select Target Academic Advisor
                                </label>
                                <select
                                    value={selectedAdvisorId}
                                    onChange={(e) => setSelectedAdvisorId(e.target.value)}
                                    className="modal-select"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px' }}
                                >
                                    <option value="">-- Search and Select Advisor --</option>
                                    {advisors.map(adv => (
                                        <option key={adv._id} value={adv._id}>
                                            {adv.advisor?.staffName ? `Dr. ${adv.advisor.staffName}` : `List: ${adv._id}`}
                                            {` | Current Load: ${adv.studentsCount} Students`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn-1"
                                onClick={handleAssign}
                                disabled={!selectedAdvisorId || submitting}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                {submitting ? <Loader2 className="animate-spin" size={18} /> : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        <span>Confirm Assignment</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UnassignedStudentsPage;