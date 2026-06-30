import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Save, Search, TrendingUp, Award, AlertCircle,
    Calendar, CheckSquare, Square, X, Filter, Users, Trash2, Check, Minus, Edit3, Lock, Unlock, Download
    , Loader2
} from 'lucide-react';
import { FaArrowLeft } from "react-icons/fa";
import api from "../../services/api";
import swalService from "../../services/swal";
import '../styles/ProgramCourses.css';

const ResultsManagement = () => {
    const { id } = useParams(); // courseOfferingId
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [localGrades, setLocalGrades] = useState([]);
    const [originalGrades, setOriginalGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [finalExamGradesStatus, setFinalExamGradesStatus] = useState("");

    const [isCorrectionMode, setIsCorrectionMode] = useState(false);


    const [searchTerm, setSearchTerm] = useState("");
    const [levelFilter, setLevelFilter] = useState("all");
    const [regFilter, setRegFilter] = useState("all");


    const [expandedStudentId, setExpandedStudentId] = useState(null);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const detailsRes = await api.get(`/control/courses/${id}/students`);
            const studentRes = detailsRes.data.semesterWorks || [];



            setCourse(detailsRes.data.course);
            setLocalGrades(studentRes);
            setFinalExamGradesStatus(detailsRes.data.course.finalExamGradesStatus || "");
            setOriginalGrades(JSON.parse(JSON.stringify(studentRes)));
            setIsCorrectionMode(false);
        } catch (err) {
            console.error("Error loading data", err);
            swalService.error("Sync Error", "Failed to load student grading data.");
        } finally {
            setLoading(false);
        }
    };

    const hasUnsavedChanges = useMemo(() => {
        return JSON.stringify(localGrades) !== JSON.stringify(originalGrades);
    }, [localGrades, originalGrades]);

    const handleGradeChange = (studentId, field, value) => {
        if (field !== 'finalGrade') return;

        const numValue = value === "" ? 0 : Number(value);
        if (numValue < 0) return;

        const maxAllowed = course.gradingSchema?.final || 0;
        if (numValue > maxAllowed) return;

        setLocalGrades(prev => prev.map(s =>
            s.studentId._id === studentId ? {
                ...s,
                grade: { ...s.grade, [field]: numValue }
            } : s
        ));
    };

    const saveEverything = async () => {
        try {
            swalService.showLoading("Saving final grades...");

            if (hasUnsavedChanges) {
                const gradePayload = {
                    grades: localGrades.map(s => ({
                        studentId: s.studentId._id,
                        finalGrade: s.grade.finalGrade
                    }))
                };


                const endpoint = finalExamGradesStatus === "approved"
                    ? `/control/courses/${id}/update-grades`
                    : `/control/courses/${id}/assign-final-grades`;

                await api.put(endpoint, gradePayload);
            }

            swalService.success("Success", "Final grades saved successfully!");
            setOriginalGrades(JSON.parse(JSON.stringify(localGrades)));
            setIsCorrectionMode(false);

        } catch (err) {
            console.error(err);
            swalService.error("Save Failed", err.response?.data?.message || "Error syncing with server.");
        }
    };

    const handleApproveGrades = async () => {
        const result = await swalService.confirm(
            "Approve Final Grades",
            "Are you sure you want to approve the final grades for this course? This action will lock initial entry."
        );

        if (result.isConfirmed) {
            try {
                swalService.showLoading("Approving...");
                await api.put(`/control/courses/${id}/approve-final-grades`);
                await swalService.success("Grades Approved", "Final grades have been approved successfully.");
                loadData();
            } catch (err) {
                swalService.error("Approval Failed", err.response?.data?.message || "Error approving grades.");
            }
        }
    };

    const handleExportCSV = () => {
        if (localGrades.length === 0) return;

        const headers = ["Student ID", "Student Name", "Midterm", "Lab/Practical", "Attendance", "Bonus", "Final", "Total"];

        const rows = filteredStudents.map(s => {
            const total = (s.grade.midTermGrade || 0) +
                (s.grade.labGrade || 0) +
                (s.grade.attendanceGrade || 0) +
                (s.grade.practicalGrade || 0) +
                (s.grade.bonusGrade || 0) +
                (s.grade.finalGrade || 0);

            return [
                s.studentId._id,
                s.studentId.studentName,
                s.grade.midTermGrade || 0,
                (s.grade.labGrade || 0) + (s.grade.practicalGrade || 0),
                s.grade.attendanceGrade || 0,
                s.grade.bonusGrade || 0,
                s.grade.finalGrade || 0,
                total
            ];
        });

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);

        const fileName = `${course?.courseId || 'Course'}_Results.csv`;
        link.setAttribute("download", fileName);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredStudents = useMemo(() => {
        return localGrades.filter(s => {
            const matchesSearch = s.studentId.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.studentId._id.includes(searchTerm);
            const matchesLevel = levelFilter === "all" || s.studentId.transcript?.level === levelFilter;
            const matchesReg = regFilter === "all" || s.studentId.transcript?.regulation === regFilter;
            return matchesSearch && matchesLevel && matchesReg;
        });
    }, [localGrades, searchTerm, levelFilter, regFilter]);

    const avgTotalGrade = useMemo(() => {
        if (localGrades.length === 0) return 0;
        const totalSum = localGrades.reduce((acc, s) => {
            return acc + (s.grade.midTermGrade || 0) + (s.grade.labGrade || 0) +
                (s.grade.attendanceGrade || 0) + (s.grade.practicalGrade || 0) +
                (s.grade.bonusGrade || 0) + (s.grade.finalGrade || 0);
        }, 0);
        return (totalSum / localGrades.length).toFixed(1);
    }, [localGrades]);

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
            <h3>Syncing Gradebook...</h3>
        </div>
    );

    return (
        <div className="management-container management-container-att">
            <header className="management-header">
                <div className="prereg-header">
                    <button className="back-btn-round" onClick={() => navigate(-1)}><FaArrowLeft /></button>
                    <h2>{course?.courseId?.courseName || course?.courseId} - Final Results</h2>
                </div>

                <div className="split-button-container" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

                    <button className="btn-2" onClick={handleExportCSV}>
                        <Download size={18} /> Export CSV
                    </button>

                    <button
                        className={`btn-1 ${(!hasUnsavedChanges) ? 'btn-disabled' : ''}`}
                        onClick={saveEverything}
                        disabled={!hasUnsavedChanges}
                    >
                        <Save size={18} /> {hasUnsavedChanges ? "Save Changes" : "Up to date"}
                    </button>


                    {finalExamGradesStatus !== "approved" ? (
                        <button
                            className="btn-1"
                            onClick={handleApproveGrades}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#10b981' }}
                        >
                            <Check size={18} /> Approve Final Grades
                        </button>
                    ) : (

                        <button
                            className="btn-1"
                            onClick={() => setIsCorrectionMode(!isCorrectionMode)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: isCorrectionMode ? '#ef4444' : '#6366f1'
                            }}
                        >
                            {isCorrectionMode ? <Lock size={18} /> : <Unlock size={18} />}
                            {isCorrectionMode ? "Lock Correction Mode" : "Enable Correction (Appeals)"}
                        </button>
                    )}
                </div>
            </header>

            <div className="insights-grid">
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-blue"><TrendingUp size={18} /></span>
                        <span className="insight-label">Total Course Average</span>
                    </div>
                    <div className="insight-value">{avgTotalGrade}<span style={{ fontSize: '16px', color: '#94a3b8' }}> / 100</span></div>
                    <div className="insight-footer">Overall performance across all components</div>
                </div>

                <div className="insight-card" style={{ gridColumn: 'span 2' }}>
                    <div className="insight-header">
                        <span className="insight-icon icon-purple"><Award size={18} /></span>
                        <span className="insight-label">Grading Schema (Max Marks)</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        {Object.entries(course?.gradingSchema || {}).map(([key, val]) => (
                            <div key={key} style={{ flex: 1, padding: '10px', background: '#f8fafc', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold' }}>{key}</p>
                                <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary-blue-color)' }}>{val}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="filters-wrapper">
                <Search size={20} color="#94a3b8" />
                <input
                    type="text"
                    placeholder="Search name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '10px' }}>
                    {filteredStudents.length} Students
                </div>

                <div className="drop-filters">
                    <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                        <option value="all">All Levels</option>
                        <option value="freshman">Freshman</option>
                        <option value="sophomore">Sophomore</option>
                        <option value="junior">Junior</option>
                        <option value="senior">Senior</option>
                    </select>
                </div>

                <div className="filter-group">
                    <select value={regFilter} onChange={(e) => setRegFilter(e.target.value)}>
                        <option value="all">All Regulations</option>
                        <option value="New">New</option>
                        <option value="last">Last</option>
                    </select>
                </div>
            </div>

            <div className="table-wrapper" style={{ marginBottom: '100px' }}>
                <table className="management-table">
                    <thead>
                        <tr>
                            <th>Student Information</th>
                            <th style={{ textAlign: 'center' }}>Mid</th>
                            <th style={{ textAlign: 'center' }}>Lab/Prac</th>
                            <th style={{ textAlign: 'center' }}>Attend</th>
                            <th style={{ textAlign: 'center' }}>Bonus</th>
                            <th style={{ textAlign: 'center' }}>Final</th>
                            <th style={{ textAlign: 'center' }}>Total (100)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map(s => {
                            const total = (s.grade.midTermGrade || 0) +
                                (s.grade.labGrade || 0) +
                                (s.grade.attendanceGrade || 0) +
                                (s.grade.practicalGrade || 0) +
                                (s.grade.bonusGrade || 0) +
                                (s.grade.finalGrade || 0);

                            const isExpanded = expandedStudentId === s.studentId._id;
                            const originalStudent = originalGrades.find(og => og.studentId._id === s.studentId._id);

                            const isInputDisabled = finalExamGradesStatus === "approved" && !isCorrectionMode;

                            return (
                                <React.Fragment key={s.studentId._id}>
                                    <tr style={{
                                        backgroundColor: isExpanded ? '#f8fafc' : 'inherit',
                                        borderLeft: isExpanded ? '4px solid #3b82f6' : 'none'
                                    }}>
                                        {/* <td onClick={() => setExpandedStudentId(isExpanded ? null : s.studentId._id)} style={{ cursor: 'pointer' }}> */}
                                        <td >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div>
                                                    <div style={{ fontWeight: '600', color: 'var(--primary-blue-color)' }}>{s.studentId.studentName}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {s.studentId._id}</div>
                                                </div>
                                            </div>
                                        </td>

                                        <td style={{ textAlign: 'center' }}>{s.grade.midTermGrade || 0}</td>
                                        <td style={{ textAlign: 'center' }}>{(s.grade.labGrade || 0) + (s.grade.practicalGrade || 0)}</td>
                                        <td style={{ textAlign: 'center' }}>{s.grade.attendanceGrade || 0}</td>
                                        <td style={{ textAlign: 'center' }}>{s.grade.bonusGrade || 0}</td>

                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="number"
                                                min="0"
                                                max={course.gradingSchema.final}
                                                value={s.grade.finalGrade}
                                                disabled={isInputDisabled}
                                                onChange={(e) => handleGradeChange(s.studentId._id, 'finalGrade', e.target.value)}
                                                style={{
                                                    width: '55px',
                                                    padding: '6px',
                                                    borderRadius: '4px',
                                                    textAlign: 'center',
                                                    border: originalStudent && s.grade.finalGrade !== originalStudent.grade.finalGrade ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                                                    backgroundColor: isInputDisabled ? '#f1f5f9' : (originalStudent && s.grade.finalGrade !== originalStudent.grade.finalGrade ? '#fffbeb' : 'white'),
                                                    fontWeight: 'bold',
                                                    cursor: isInputDisabled ? 'not-allowed' : 'text'
                                                }}
                                            />
                                        </td>

                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                fontWeight: 'bold',
                                                color: total < 60 ? '#ef4444' : '#2563eb',
                                                fontSize: '1.1em'
                                            }}>
                                                {total}
                                            </span>
                                        </td>
                                    </tr>

                                    {
                                        isExpanded && (
                                            <tr>
                                                <td colSpan="7" style={{ padding: '0' }}>
                                                    <div style={{ background: '#f8fafc', padding: '15px 50px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '30px' }}>
                                                            <div>
                                                                <p style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>GPA Score</p>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <Award size={16} color="#f59e0b" />
                                                                    <span style={{ fontWeight: 'bold', color: 'var(--primary-blue-color)' }}>{s.studentId.transcript?.GPA || 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Academic Level</p>
                                                                <span className="type-badge" style={{ background: '#dcfce7', color: '#166534', fontSize: '11px' }}>
                                                                    {s.studentId.transcript?.level || 'Unknown'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Regulation</p>
                                                                <span style={{ fontWeight: '500', color: 'var(--primary-blue-color)' }}>{s.studentId.transcript?.regulation || 'Standard'}</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => setExpandedStudentId(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px' }}>
                                                            <X size={14} color="#64748b" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    }
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {
                hasUnsavedChanges && (
                    <div className="unsaved-alert" style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary-blue-color)', color: 'white', padding: '12px 24px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 1000, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                        <AlertCircle size={20} color="#f59e0b" />
                        <span style={{ fontSize: '13px' }}>
                            You have unsaved Final Grades {isCorrectionMode ? "(Correction Mode active)" : ""}
                        </span>
                        <button onClick={saveEverything} style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '6px 18px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>Save Now</button>
                    </div>
                )
            }
        </div >
    );
};

export default ResultsManagement;