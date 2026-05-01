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

const CourseGrading = () => {
    const { role } = useParams();
    const { id, courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [localGrades, setLocalGrades] = useState([]);
    const [originalGrades, setOriginalGrades] = useState([]);
    const [loading, setLoading] = useState(true);

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
        fetchAttendanceOnly(); // لجلب التواريخ المسجلة مسبقاً عند التحميل
    }, [id]);

    const loadData = async () => {
        try {
            const [detailsRes, studentRes] = await Promise.all([
                api.get(`/lecturers/me/courses/${id}`),
                api.get(`/semester-work/course/${courseId}`)
            ]);

            setCourse(detailsRes.data.course);
            setLocalGrades(studentRes.data);
            setOriginalGrades(JSON.parse(JSON.stringify(studentRes.data)));
        } catch (err) {
            console.error("Error loading data", err);
            swalService.error("Sync Error", "Failed to load student grading data.");
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceOnly = async () => {
        try {
            const res = await api.get(`/lecturers/me/courses/${id}/attendance`);
            setLecDates(res.data.lecDates);
            setAttendanceData(res.data.attendanceData);
        } catch (err) {
            console.error("Attendance fetch error", err);
        }
    };

    // Load attendance matrix for modal
    const loadAttendanceMatrix = async () => {
        try {
            swalService.showLoading("Loading Matrix...");
            const res = await api.get(`/lecturers/me/courses/${id}/attendance`);
            setAttendanceData(res.data.attendanceData);
            setLecDates(res.data.lecDates);
            setShowAttendanceModal(true);
            swalService.close();
        } catch {
            swalService.error("Error", "Failed to load attendance");
        }
    };

    const hasUnsavedChanges = useMemo(() => {
        return JSON.stringify(localGrades) !== JSON.stringify(originalGrades);
    }, [localGrades, originalGrades]);

    const hasAttendanceToSave = presentStudents.length > 0;

    // تشيك لو التاريخ المختار موجود فعلاً في قاعدة البيانات (تم تحضيره مسبقاً)
    const isTodayAttendanceTaken = useMemo(() => {
        return lecDates.some(d => new Date(d).toISOString().split("T")[0] === selectedDate);
    }, [lecDates, selectedDate]);

    const handleGradeChange = (studentId, field, value) => {
        // 1. منع تعديل درجة الغياب يدوياً لأنها بتيجي من الباك إند
        if (field === 'attendanceGrade') return;

        const numValue = Number(value);

        // 2. منع الأرقام السالبة
        if (numValue < 0) return;

        const schemaField = field.replace('Grade', '');
        const maxAllowed = course.gradingSchema[schemaField] || 0;

        // 3. منع تخطي الدرجة النهائية
        if (numValue > maxAllowed) return;

        setLocalGrades(prev => prev.map(s =>
            s.studentId._id === studentId ? {
                ...s,
                grade: { ...s.grade, [field]: numValue }
            } : s
        ));
    };

    const toggleAttendance = (studentId) => {
        if (isTodayAttendanceTaken) return;
        setPresentStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const saveEverything = async () => {
        try {
            swalService.showLoading("Saving data...");

            if (hasUnsavedChanges) {
                const gradePayload = {
                    grades: localGrades.map(s => ({
                        studentId: s.studentId._id,
                        midTermGrade: s.grade.midTermGrade,
                        attendanceGrade: s.grade.attendanceGrade,
                        labGrade: s.grade.labGrade,
                        practicalGrade: s.grade.practicalGrade,
                        bonusGrade: s.grade.bonusGrade
                    }))
                };
                await api.put(`/lecturers/me/courses/${id}/grades`, gradePayload);
            }

            if (hasAttendanceToSave) {
                // تعديل بناءً على الـ API Request format الجديد
                const attendancePayload = {
                    lecDate: selectedDate,
                    students: presentStudents
                };
                await api.put(`/lecturers/me/courses/${id}/attendance`, attendancePayload);
            }

            swalService.success("Success", "All changes saved successfully!");
            setOriginalGrades(JSON.parse(JSON.stringify(localGrades)));
            setPresentStudents([]);
            fetchAttendanceOnly();
        } catch (err) {
            console.error(err);
            swalService.error("Save Failed", err.response?.data?.message || "Error syncing with server.");
        }
    };

    const deleteLecture = async (date) => {
        const result = await swalService.confirm("Are you sure?", `This will delete all attendance records for ${new Date(date).toLocaleDateString()}`);
        if (result.isConfirmed) {
            try {
                await api.delete(`/lecturers/me/courses/${id}/lecture-dates`, { data: { lecDate: date } });
                swalService.success("Deleted", "Lecture records removed.");
                loadAttendanceMatrix(); // إعادة تحميل الماتريكس
                fetchAttendanceOnly();   // تحديث الحالة العامة
            } catch (err) {
                swalService.error("Error", "Failed to delete lecture.");
            }
        }
    };

    const updateStudentAttendance = async (studentId, lectureIndex, currentStatus) => {
        try {
            // status: 0 for absent, 1 for present
            await api.put(`/lecturers/me/courses/${id}/attendance/${studentId}`, {
                lectureIndex,
                status: currentStatus ? 0 : 1
            });
            loadAttendanceMatrix();
        } catch {
            swalService.error("Error", "Update failed");
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
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: isTodayAttendanceTaken ? '#fee2e2' : '#f8fafc',
                        padding: '5px 15px',
                        borderRadius: '10px',
                        border: isTodayAttendanceTaken ? '1px solid #ef4444' : '1px solid #e2e8f0'
                    }}>
                        <Calendar size={16} color={isTodayAttendanceTaken ? "#ef4444" : "#64748b"} />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 'bold', outline: 'none' }}
                        />
                        {isTodayAttendanceTaken && <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 'bold' }}>TAKEN</span>}
                    </div>

                    <button
                        className={`btn-1 ${(!hasUnsavedChanges && !hasAttendanceToSave) ? 'btn-disabled' : ''}`}
                        onClick={saveEverything}
                        disabled={!hasUnsavedChanges && !hasAttendanceToSave}
                    >
                        <Save size={18} /> {(hasUnsavedChanges || hasAttendanceToSave) ? "Save Everything" : "Up to date"}
                    </button>
                    {/* <button className="btn-1" onClick={loadAttendanceMatrix} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} /> Manage Attendance
                    </button> */}
                    <button
                        className="btn-1"
                        onClick={() => navigate(`/staff/${role}/grading/${id}/attendance`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Users size={18} /> Manage Attendance
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
                            <th style={{ width: '50px' }}>Att.</th>
                            <th>Student Information</th>
                            <th style={{ textAlign: 'center' }}>Mid</th>
                            <th style={{ textAlign: 'center' }}>Lab</th>
                            <th style={{ textAlign: 'center' }}>Attend</th>
                            <th style={{ textAlign: 'center' }}>Pract</th>
                            <th style={{ textAlign: 'center' }}>Bonus</th>
                            <th style={{ textAlign: 'center' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map(s => {
                            const total = (s.grade.midTermGrade || 0) + (s.grade.labGrade || 0) + (s.grade.attendanceGrade || 0) + (s.grade.practicalGrade || 0);
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
                                        <td style={{ textAlign: 'center' }}>
                                            <button onClick={() => toggleAttendance(s.studentId._id)}
                                                disabled={isTodayAttendanceTaken}
                                                style={{ background: 'none', border: 'none', cursor: isTodayAttendanceTaken ? 'not-allowed' : 'pointer' }}
                                            >
                                                {isPresent ? <CheckSquare size={20} color="#2563eb" fill="#eff6ff" /> : <Square size={20} color="#cbd5e1" />}
                                            </button>
                                        </td>
                                        <td
                                            onClick={() => setExpandedStudentId(isExpanded ? null : s.studentId._id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '35px', height: '35px', borderRadius: '8px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                                                    {s.studentId.studentName.charAt(0)}
                                                </div>
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
                                            { key: 'bonusGrade', max: 10 }
                                        ].map(field => {
                                            const isChanged = originalStudent && s.grade[field.key] !== originalStudent.grade[field.key];
                                            const isAttendance = field.key === 'attendanceGrade';

                                            return (
                                                <td key={field.key} style={{ textAlign: 'center' }}>
                                                    <input
                                                        type="number"
                                                        min="0" // حماية إضافية على مستوى HTML
                                                        value={s.grade[field.key]}
                                                        readOnly={isAttendance} // القفل هنا
                                                        onChange={(e) => handleGradeChange(s.studentId._id, field.key, e.target.value)}
                                                        style={{
                                                            width: '45px',
                                                            padding: '4px',
                                                            borderRadius: '4px',
                                                            textAlign: 'center',
                                                            // ستايل مختلف لو هو حقل غياب عشان اليوزر يعرف إنه ممنوع
                                                            border: isAttendance ? '1px solid #cbd5e1' : (isChanged ? '1px solid #f59e0b' : '1px solid #e2e8f0'),
                                                            backgroundColor: isAttendance ? '#f1f5f9' : (isChanged ? '#fffbeb' : 'white'),
                                                            color: isAttendance ? '#64748b' : 'var( --primary-blue-color)',
                                                            cursor: isAttendance ? 'not-allowed' : 'text'
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

            {/* 🔥 Enhanced Attendance Modal */}
            {showAttendanceModal && (
                <div className="modal-overlay">
                    <div className="modal-card" style={{ width: '95%', maxWidth: '1200px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-head" style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Attendance Matrix</h3>
                                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>View and modify historical attendance records</p>
                            </div>
                            <button className="close-btn" onClick={() => setShowAttendanceModal(false)}><X /></button>
                        </div>

                        <div style={{ overflow: 'auto', flex: 1, padding: '10px' }}>
                            <table className="management-table" style={{ fontSize: '13px' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ minWidth: '200px' }}>Student Name</th>
                                        {lecDates.map((d, i) => (
                                            <th key={i} style={{ textAlign: 'center', minWidth: '100px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                                    <span style={{ fontSize: '11px' }}>{new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                                    <button
                                                        onClick={() => deleteLecture(d)}
                                                        style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}
                                                        title="Delete this lecture"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceData.map(s => (
                                        <tr key={s.studentId}>
                                            <td style={{ fontWeight: '600' }}>{s.studentName}</td>
                                            {s.attendanceTimes.map((val, i) => (
                                                <td key={i} style={{ textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => updateStudentAttendance(s.studentId, i, val)}
                                                        style={{
                                                            width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #e2e8f0',
                                                            background: val ? '#dcfce7' : '#fff',
                                                            color: val ? '#166534' : '#cbd5e1',
                                                            cursor: 'pointer', transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {val ? <Check size={16} /> : <Minus size={16} />}
                                                    </button>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default CourseGrading;