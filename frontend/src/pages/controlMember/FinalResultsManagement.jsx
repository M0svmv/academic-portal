import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Save, Search, TrendingUp, Award, AlertCircle,
    CheckCircle, Info, X, Filter, GraduationCap, ChevronDown, ChevronUp
    , Loader2
} from 'lucide-react';
import { FaArrowLeft } from "react-icons/fa";
import api from "../../services/api";
import swalService from "../../services/swal";
import '../styles/ProgramCourses.css';

const FinalResultsManagement = () => {
    const { role, id } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [localGrades, setLocalGrades] = useState([]);
    const [originalGrades, setOriginalGrades] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedStudentId, setExpandedStudentId] = useState(null);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const res = await api.get(`/control/courses/${id}/students`);

            setCourse(res.data.course);
            setLocalGrades(res.data.semesterWorks);
            setOriginalGrades(JSON.parse(JSON.stringify(res.data.semesterWorks)));
        } catch (err) {
            console.error("Error loading control data", err);
            swalService.error("Fetch Error", "Failed to load course students for control.");
        } finally {
            setLoading(false);
        }
    };

    const hasUnsavedChanges = useMemo(() => {
        return JSON.stringify(localGrades) !== JSON.stringify(originalGrades);
    }, [localGrades, originalGrades]);

    const handleFinalGradeChange = (studentId, value) => {
        const numValue = Number(value);
        if (numValue < 0) return;

        const maxFinal = course.gradingSchema.final || 0;
        if (numValue > maxFinal) return;

        setLocalGrades(prev => prev.map(s =>
            s.studentId._id === studentId ? {
                ...s,
                grade: { ...s.grade, finalGrade: numValue }
            } : s
        ));
    };

    const saveFinalResults = async () => {
        try {
            swalService.showLoading("Publishing Results...");

            const payload = {
                grades: localGrades.map(s => ({
                    studentId: s.studentId._id,
                    finalGrade: s.grade.finalGrade
                }))
            };

            await api.put(`/control/courses/${id}/final-grades`, payload);

            swalService.success("Success", "Final grades have been recorded successfully.");
            setOriginalGrades(JSON.parse(JSON.stringify(localGrades)));
        } catch (err) {
            swalService.error("Save Failed", err.response?.data?.message || "Error updating final results.");
        }
    };

    const filteredStudents = useMemo(() => {
        return localGrades.filter(s =>
            s.studentId.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.studentId._id.includes(searchTerm)
        );
    }, [localGrades, searchTerm]);

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
            <h3>Accessing Control Records...</h3>
        </div>
    );

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="prereg-header">
                    <button className="back-btn-round" onClick={() => navigate(-1)}><FaArrowLeft /></button>
                    <div>
                        <h2 style={{ marginBottom: '4px' }}>Final Results: {course?.courseId}</h2>
                        <span className="type-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>{course?.semesterId}</span>
                    </div>
                </div>

                <div className="action-buttons">
                    <button
                        className={`btn-1 ${!hasUnsavedChanges ? 'btn-disabled' : ''}`}
                        onClick={saveFinalResults}
                        disabled={!hasUnsavedChanges}
                    >
                        <CheckCircle size={18} /> {hasUnsavedChanges ? "Submit Final Results" : "All Results Posted"}
                    </button>
                </div>
            </header>

            <div className="insights-grid">
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-blue"><GraduationCap size={18} /></span>
                        <span className="insight-label">Enrollment</span>
                    </div>
                    <div className="insight-value">{localGrades.length} Students</div>
                </div>

                <div className="insight-card" style={{ gridColumn: 'span 2' }}>
                    <div className="insight-header">
                        <span className="insight-icon icon-purple"><Award size={18} /></span>
                        <span className="insight-label">Max Distribution</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        {Object.entries(course?.gradingSchema || {}).map(([key, val]) => (
                            <div key={key} className={`schema-box ${key === 'final' ? 'highlighted' : ''}`}>
                                <p className="schema-key">{key}</p>
                                <p className="schema-val">{val}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="filters-wrapper">
                <Search size={20} color="#94a3b8" />
                <input
                    type="text"
                    placeholder="Search by student name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="table-wrapper">
                <table className="management-table">
                    <thead>
                        <tr>
                            <th>Student Details</th>
                            <th style={{ textAlign: 'center' }}>Midterm</th>
                            <th style={{ textAlign: 'center' }}>Work/Lab</th>
                            <th style={{ textAlign: 'center' }}>Attendance</th>
                            <th style={{ textAlign: 'center', background: '#f0f9ff' }}>FINAL ({course?.gradingSchema?.final})</th>
                            <th style={{ textAlign: 'center' }}>Total / 100</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map(s => {
                            // حساب التوتال: أعمال سنة + الفاينل الجديد
                            const semesterWorkTotal = (s.grade.midTermGrade || 0) + (s.grade.labGrade || 0) + (s.grade.practicalGrade || 0) + (s.grade.attendanceGrade || 0) + (s.grade.bonusGrade || 0);
                            const finalGrade = s.grade.finalGrade || 0;
                            const grandTotal = semesterWorkTotal + finalGrade;

                            const isExpanded = expandedStudentId === s.studentId._id;
                            const isChanged = originalGrades.find(og => og.studentId._id === s.studentId._id)?.grade.finalGrade !== s.grade.finalGrade;

                            return (
                                <React.Fragment key={s._id}>
                                    <tr className={isExpanded ? 'expanded-row' : ''}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <button
                                                    onClick={() => setExpandedStudentId(isExpanded ? null : s.studentId._id)}
                                                    className="expand-btn"
                                                >
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                                <div>
                                                    <div style={{ fontWeight: '600' }}>{s.studentId.studentName}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{s.studentId._id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center', color: '#64748b' }}>{s.grade.midTermGrade}</td>
                                        <td style={{ textAlign: 'center', color: '#64748b' }}>{(s.grade.labGrade || 0) + (s.grade.practicalGrade || 0)}</td>
                                        <td style={{ textAlign: 'center', color: '#64748b' }}>{s.grade.attendanceGrade}</td>

                                        {/* خانة الفاينل - الوحيدة القابلة للتعديل */}
                                        <td style={{ textAlign: 'center', background: '#f0f9ff' }}>
                                            <input
                                                type="number"
                                                className={`final-input ${isChanged ? 'changed' : ''}`}
                                                value={s.grade.finalGrade}
                                                onChange={(e) => handleFinalGradeChange(s.studentId._id, e.target.value)}
                                            />
                                        </td>

                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                fontWeight: 'bold',
                                                color: grandTotal >= 50 ? '#166534' : '#ef4444',
                                                fontSize: '15px'
                                            }}>
                                                {grandTotal}
                                            </span>
                                        </td>
                                    </tr>

                                    {isExpanded && (
                                        <tr className="details-subrow">
                                            <td colSpan="6">
                                                <div className="details-content">
                                                    <div className="detail-item"><Info size={14} /> <span>Phone: {s.studentId.studentPhone}</span></div>
                                                    <div className="detail-item"><Award size={14} /> <span>Bonus: {s.grade.bonusGrade}</span></div>
                                                    <div className="detail-item"><TrendingUp size={14} /> <span>Semester Total: {semesterWorkTotal}</span></div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {hasUnsavedChanges && (
                <div className="unsaved-alert-fixed">
                    <AlertCircle size={20} />
                    <span>You have unsaved final results for this course</span>
                    <button onClick={saveFinalResults}>Save Now</button>
                </div>
            )}
        </div>
    );
};

export default FinalResultsManagement;