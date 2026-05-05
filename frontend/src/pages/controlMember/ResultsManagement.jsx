import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Save, Search, TrendingUp, Award, AlertCircle,
    Calendar, CheckSquare, Square, X, Filter, Users, Trash2, Check, Minus
} from 'lucide-react';
import { FaArrowLeft } from "react-icons/fa";
import api from "../../services/api";
import swalService from "../../services/swal";
import '../styles/ProgramCourses.css';

const ResultsManagement = () => {
    const { role } = useParams();
    const { id, courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [localGrades, setLocalGrades] = useState([]);
    const [originalGrades, setOriginalGrades] = useState([]);
    const [loading, setLoading] = useState(true);

    const [finalExamGradesStatus, setFinalExamGradesStatus] = useState("");

    // States للبحث والفلاتر
    const [searchTerm, setSearchTerm] = useState("");
    const [levelFilter, setLevelFilter] = useState("all");
    const [regFilter, setRegFilter] = useState("all");

    // State للتحكم في الصف المفتوح (التفاصيل)
    const [expandedStudentId, setExpandedStudentId] = useState(null);

    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [attendanceData, setAttendanceData] = useState([]);
    const [lecDates, setLecDates] = useState([]);

    const today = new Date().toISOString().split('T')[0];

    // States للتحضير والتاريخ
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [presentStudents, setPresentStudents] = useState([]);

    useEffect(() => {
        loadData();
        // fetchAttendanceOnly(); // لجلب التواريخ المسجلة مسبقاً عند التحميل
    }, [id]);

    const loadData = async () => {
        try {
           

            const detailsRes = await api.get(`/control/courses/${id}/students`);
            const studentRes = detailsRes.data.semesterWorks || [];

            setCourse(detailsRes.data.course);
            setLocalGrades( detailsRes.data.semesterWorks || [] );

            setFinalExamGradesStatus(detailsRes.data.course.finalExamGradesStatus || "");
            setOriginalGrades(JSON.parse(JSON.stringify(studentRes)));
        } catch (err) {
            console.error("Error loading data", err);
            swalService.error("Sync Error", "Failed to load student grading data.");
        } finally {
            setLoading(false);
        }
    };

    

    

    // Load attendance matrix for modal
    

    const hasUnsavedChanges = useMemo(() => {
        return JSON.stringify(localGrades) !== JSON.stringify(originalGrades);
    }, [localGrades, originalGrades]);

    const hasAttendanceToSave = presentStudents.length > 0;

    // تشيك لو التاريخ المختار موجود فعلاً في قاعدة البيانات (تم تحضيره مسبقاً)
    const isTodayAttendanceTaken = useMemo(() => {
        return lecDates.some(d => new Date(d).toISOString().split("T")[0] === selectedDate);
    }, [lecDates, selectedDate]);

    const handleGradeChange = (studentId, field, value) => {
      
        if (field === 'attendanceGrade') return;
        if (field === 'midTermGrade') return;
        if (field === 'labGrade') return;
        if (field === 'practicalGrade') return;
        if (field === 'bonusGrade') return;

        const numValue = Number(value);

        if (numValue < 0) return;

        const schemaField = field.replace('Grade', '');
        const maxAllowed = course.gradingSchema[schemaField] || 0;

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
            swalService.showLoading("Saving data...");

            if (hasUnsavedChanges) {
                const gradePayload = {
                    grades: localGrades.map(s => ({
                        studentId: s.studentId._id,
                        finalGrade: s.grade.finalGrade
                    }))
                };
                await api.put(`/control/courses/${id}/assign-final-grades`, gradePayload);
            }

            

            swalService.success("Success", "All changes saved successfully!");
            setOriginalGrades(JSON.parse(JSON.stringify(localGrades)));
            setPresentStudents([]);
            
        } catch (err) {
            console.error(err);
            swalService.error("Save Failed", err.response?.data?.message || "Error syncing with server.");
        }
    };

    

    


    const filteredStudents = useMemo(() => {
        return localGrades.filter(s => {
            const matchesSearch = s.studentId.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || s.studentId._id.includes(searchTerm);
            const matchesLevel = levelFilter === "all" || s.studentId.transcript?.level === levelFilter;
            const matchesReg = regFilter === "all" || s.studentId.transcript?.regulation === regFilter;
            return matchesSearch && matchesLevel && matchesReg;
        });
    }, [localGrades, searchTerm, levelFilter, regFilter]);

    const avgGrade = localGrades.length > 0
        ? (localGrades.reduce((acc, curr) => acc + (curr.grade.midTermGrade + curr.grade.attendanceGrade + curr.grade.labGrade + curr.grade.practicalGrade), 0) / localGrades.length).toFixed(1)
        : 0;

    if (loading) return (
        <div className="management-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
            <h3>Syncing Gradebook...</h3>
        </div>
    );

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="prereg-header">
                    <button className="back-btn-round" onClick={() => navigate(-1)}><FaArrowLeft /></button>
                    <h2>{course?.courseId?.courseName || course?.courseId}</h2>
                </div>

                <div className="split-button-container" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    

                    <button
                        className={`btn-1 ${(!hasUnsavedChanges ) ? 'btn-disabled' : ''}`}
                        onClick={saveEverything}
                        disabled={!hasUnsavedChanges }
                    >
                        <Save size={18} /> {(hasUnsavedChanges ) ? "Save Everything" : "Up to date"}
                    </button>

                    <button
                        className="btn-1"
                        onClick={async () => {const result = await swalService.confirm("Approve Final Grades", "Are you sure you want to approve the final grades for this course? This action cannot be undone.")    
                        if (result.isConfirmed) {
                            await api.put(`/control/courses/${id}/approve-final-grades`);
                            await swalService.success("Grades Approved", "Final grades have been approved successfully.");
                        }
                            
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Users size={18} /> Approve Final Grades
                    </button>
                </div>
            </header>

            <div className="insights-grid">
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-blue"><TrendingUp size={18} /></span>
                        <span className="insight-label">Class Average</span>
                    </div>
                    <div className="insight-value">{avgGrade}<span style={{ fontSize: '16px', color: '#94a3b8' }}> / 50</span></div>
                    <div className="insight-footer">Based on current local entries</div>
                </div>

                <div className="insight-card" style={{ gridColumn: 'span 2' }}>
                    <div className="insight-header">
                        <span className="insight-icon icon-purple"><Award size={18} /></span>
                        <span className="insight-label">Mark Distribution (Max)</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        {Object.entries(course?.gradingSchema || {}).map(([key, val]) => (
                            <div key={key} style={{ flex: 1, padding: '10px', background: '#f8fafc', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold' }}>{key}</p>
                                <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var( --primary-blue-color)' }}>{val}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="filters-wrapper" >
                <Search size={20} color="#94a3b8" />
                <input
                    type="text"
                    placeholder="Search name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '10px' }}>
                    {filteredStudents.length} / {localGrades.length} Students
                </div>

                <div className="drop-filters" >
                    <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                        <option value="all">All Levels</option>
                        <option value="freshman">Freshman</option>
                        <option value="sophomore">Sophomore</option>
                        <option value="junior">Junior</option>
                        <option value="senior">Senior</option>
                    </select>
                </div>

                <div className="filter-group" >
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
                            <th style={{ textAlign: 'center' }}>Lab</th>
                            <th style={{ textAlign: 'center' }}>Attend</th>
                            <th style={{ textAlign: 'center' }}>Pract</th>
                            <th style={{ textAlign: 'center' }}>Bonus</th>
                            <th style={{ textAlign: 'center' }}>Final</th>
                            <th style={{ textAlign: 'center' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map(s => {
                            const total = (s.grade.midTermGrade || 0) + (s.grade.labGrade || 0) + (s.grade.attendanceGrade || 0) + (s.grade.practicalGrade || 0)+ (s.grade.bonusGrade || 0)+ (s.grade.finalGrade || 0);
                            const isPresent = presentStudents.includes(s.studentId._id);
                            const isExpanded = expandedStudentId === s.studentId._id;
                            const originalStudent = originalGrades.find(og => og.studentId._id === s.studentId._id);

                            return (
                                <React.Fragment key={s._id}>
                                    <tr
                                        style={{
                                            backgroundColor: isPresent ? '#f0f9ff' : (isExpanded ? '#f8fafc' : 'inherit'),
                                            borderLeft: isExpanded ? '4px solid #3b82f6' : 'none',
                                            opacity: isTodayAttendanceTaken ? 0.8 : 1
                                        }}
                                    >
                                        
                                        <td
                                            onClick={() => setExpandedStudentId(isExpanded ? null : s.studentId._id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {/* <div style={{ width: '35px', height: '35px', borderRadius: '8px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                                                    {s.studentId.studentName.charAt(0)}
                                                </div> */}
                                                <div>
                                                    <div style={{ fontWeight: '600', color: 'var( --primary-blue-color)' }}>{s.studentId.studentName}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {s.studentId._id}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {[
                                            { key: 'midTermGrade', max: course.gradingSchema.midTerm },
                                            { key: 'labGrade', max: course.gradingSchema.lab },
                                            { key: 'attendanceGrade', max: course.gradingSchema.attendance }, // ده اللي هيقفل
                                            { key: 'practicalGrade', max: course.gradingSchema.practical },
                                            { key: 'bonusGrade', max: course.gradingSchema.bonus },
                                            { key: 'finalGrade', max: course.gradingSchema.final },
                                        ].map(field => {
                                            const isChanged = originalStudent && s.grade[field.key] !== originalStudent.grade[field.key];
                                            const isAttendance = field.key === 'attendanceGrade';
                                            const isLab = field.key === 'labGrade';
                                            const isMid = field.key === 'midTermGrade';
                                            const isPractical = field.key === 'practicalGrade';
                                            const isBonus = field.key === 'bonusGrade';

                                            const isFinal = finalExamGradesStatus === "approved" ? field.key === 'finalGrade': '';

                                            return (
                                                <td key={field.key} style={{ textAlign: 'center' }}>
                                                    <input
                                                        type="number"
                                                        min="0" // حماية إضافية على مستوى HTML
                                                        value={s.grade[field.key]}
                                                        readOnly={isAttendance || isLab || isMid || isPractical || isBonus || isFinal} // القفل هنا
                                                        onChange={(e) => handleGradeChange(s.studentId._id, field.key, e.target.value)}
                                                        style={{
                                                            width: '45px',
                                                            padding: '4px',
                                                            borderRadius: '4px',
                                                            textAlign: 'center',
                                                            // ستايل مختلف لو هو حقل غياب عشان اليوزر يعرف إنه ممنوع
                                                            border: isAttendance ? '1px solid #cbd5e1' : (isChanged ? '1px solid #f59e0b' : '1px solid #e2e8f0'),
                                                            backgroundColor: isAttendance || isLab || isMid || isPractical || isBonus || isFinal ? '#f1f5f9' : (isChanged ? '#fffbeb' : 'white'),
                                                            color: isAttendance || isLab || isMid || isPractical || isBonus || isFinal ? '#64748b' : 'var( --primary-blue-color)',
                                                            cursor: isAttendance || isLab || isMid || isPractical || isBonus || isFinal ? 'not-allowed' : 'text'
                                                        }}
                                                    />
                                                </td>
                                            );
                                        })}
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{total}</span>
                                        </td>
                                    </tr>

                                    {isExpanded && (
                                        <tr>
                                            <td colSpan="8" style={{ padding: '0' }}>
                                                <div style={{ background: '#f8fafc', padding: '15px 50px', borderBottom: '1px solid #e2e8f0', position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '30px' }}>
                                                        <div>
                                                            <p style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>GPA Score</p>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <Award size={16} color="#f59e0b" />
                                                                <span style={{ fontWeight: 'bold', color: 'var( --primary-blue-color)' }}>{s.studentId.transcript?.GPA || 'N/A'}</span>
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
                                                            <span style={{ fontWeight: '500', color: 'var( --primary-blue-color)' }}>{s.studentId.transcript?.regulation || 'Standard'}</span>
                                                        </div>
                                                        <div>
                                                            <p style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Contact</p>
                                                            <span style={{ fontSize: '12px', color: '#64748b' }}>{s.studentId.studentPhone}</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setExpandedStudentId(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px' }}>
                                                        <X size={14} color="#64748b" />
                                                    </button>
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

            {(hasUnsavedChanges || hasAttendanceToSave) && (
                <div className="unsaved-alert" style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'var( --primary-blue-color)', color: 'white', padding: '12px 24px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 1000, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <AlertCircle size={20} color="#f59e0b" />
                    <span style={{ fontSize: '13px' }}>Unsaved {hasUnsavedChanges ? "Grades" : ""} {hasUnsavedChanges && hasAttendanceToSave ? "&" : ""} {hasAttendanceToSave ? "Attendance" : ""}</span>
                    <button onClick={saveEverything} style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '6px 18px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>Save Changes</button>
                </div>
            )}

            
        </div>
    );
};

export default ResultsManagement;