import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Users, Trash2, Check, Minus, ArrowLeft,
    Calendar, UsersRound, AlertTriangle, Download,
    Search, Filter, Save
} from 'lucide-react';
import api from "../../services/api";
import swalService from "../../services/swal";
import '../styles/ProgramCourses.css';

const AttendanceManagement = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [attendanceData, setAttendanceData] = useState([]);
    const [lecDates, setLecDates] = useState([]);
    const [courseName, setCourseName] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadAttendanceMatrix();
    }, [id]);

    const loadAttendanceMatrix = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/lecturers/me/courses/${id}/attendance`);
            setAttendanceData(res.data.attendanceData);
            setLecDates(res.data.lecDates);
            setCourseName(res.data.courseName || "Course Attendance");
        } catch (err) {
            console.error("Error loading matrix", err);
            swalService.error("Error", "Failed to load attendance records");
        } finally {
            setLoading(false);
        }
    };

    const updateStudentAttendance = async (studentId, lectureIndex, currentStatus) => {
        try {
            // status: 0 for absent, 1 for present
            await api.put(`/lecturers/me/courses/${id}/attendance/${studentId}`, {
                lectureIndex,
                status: currentStatus ? 0 : 1
            });

            // تحديث محلي سريع للـ UI قبل ما نسحب البيانات تاني (Optional for Speed)
            setAttendanceData(prev => prev.map(s =>
                s.studentId === studentId
                    ? { ...s, attendanceTimes: s.attendanceTimes.map((v, i) => i === lectureIndex ? (currentStatus ? 0 : 1) : v) }
                    : s
            ));
        } catch (err) {
            swalService.error("Error", "Update failed");
        }
    };

    const deleteLecture = async (date) => {
        const result = await swalService.confirm(
            "Delete Lecture?",
            `This will permanently remove all attendance for ${new Date(date).toLocaleDateString()}.`
        );
        if (result.isConfirmed) {
            try {
                await api.delete(`/lecturers/me/courses/${id}/lecture-dates`, { data: { lecDate: date } });
                swalService.success("Deleted", "Lecture records removed.");
                loadAttendanceMatrix();
            } catch (err) {
                swalService.error("Error", "Failed to delete lecture.");
            }
        }
    };

    // إحصائيات سريعة (Attendance Insights)
    const stats = useMemo(() => {
        if (!attendanceData.length) return { avg: 0, lowAtt: 0 };

        let totalPresent = 0;
        let totalPossible = attendanceData.length * lecDates.length;
        let lowAttendanceCount = 0;

        attendanceData.forEach(s => {
            const studentPresentCount = s.attendanceTimes.filter(v => v === 1).length;
            totalPresent += studentPresentCount;

            // لو حضور الطالب أقل من 60% مثلاً
            if (lecDates.length > 0 && (studentPresentCount / lecDates.length) < 0.6) {
                lowAttendanceCount++;
            }
        });

        return {
            avg: totalPossible > 0 ? ((totalPresent / totalPossible) * 100).toFixed(1) : 0,
            lowAtt: lowAttendanceCount,
            totalLec: lecDates.length
        };
    }, [attendanceData, lecDates]);

    const filteredAttendance = attendanceData.filter(s =>
        s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentId.includes(searchTerm)
    );

    if (loading) return (
        <div className="management-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
            <div className="loader-box">
                <h3>Building Attendance Matrix...</h3>
            </div>
        </div>
    );

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="prereg-header">
                    <button className="back-btn-round" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2>Attendance Matrix</h2>
                        <p style={{ color: '#64748b', fontSize: '14px' }}>{courseName}</p>
                    </div>
                </div>

                <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
                    <div className="search-wrapper-mini">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Find student..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-1" onClick={() => window.print()}>
                        <Download size={18} /> Export PDF
                    </button>
                </div>
            </header>

            <div className="insights-grid">
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-blue"><UsersRound size={18} /></span>
                        <span className="insight-label">Attendance Rate</span>
                    </div>
                    <div className="insight-value">{stats.avg}%</div>
                    <div className="insight-footer">Overall class participation</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-purple"><Calendar size={18} /></span>
                        <span className="insight-label">Total Lectures</span>
                    </div>
                    <div className="insight-value">{stats.totalLec}</div>
                    <div className="insight-footer">Sessions recorded so far</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-red"><AlertTriangle size={18} /></span>
                        <span className="insight-label">At Risk Students</span>
                    </div>
                    <div className="insight-value">{stats.lowAtt}</div>
                    <div className="insight-footer">Students below 60% attendance</div>
                </div>
            </div>

            <div className="table-wrapper full-page-matrix" style={{ marginTop: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <table className="management-table">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                            <th className="sticky-col" >
                                Student Information
                            </th>
                            {lecDates.map((d, i) => (
                                <th key={i} className="lec-column-header">
                                    <div className="lec-header-content">
                                        <span className="lec-date">
                                            {new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                        </span>
                                        <button
                                            className="lec-delete-btn-overlay"
                                            onClick={() => deleteLecture(d)}
                                            title="Delete Lecture"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAttendance.map(student => {
                            const presentCount = student.attendanceTimes.filter(v => v === 1).length;
                            const ratio = (presentCount / lecDates.length) * 100;

                            return (
                                <tr key={student.studentId}>
                                    <td className="sticky-col" style={{ left: 0 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: '600', color: 'var( --primary-blue-color)' }}>{student.studentName}</span>
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                ID: {student.studentId} • {presentCount}/{lecDates.length}
                                            </span>
                                            <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', marginTop: '4px' }}>
                                                <div style={{
                                                    width: `${ratio}%`,
                                                    height: '100%',
                                                    background: ratio < 60 ? '#ef4444' : '#22c55e',
                                                    borderRadius: '2px'
                                                }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    {student.attendanceTimes.map((val, i) => (
                                        <td key={i} style={{ textAlign: 'center' }}>
                                            <button
                                                onClick={() => updateStudentAttendance(student.studentId, i, val)}
                                                className={`att-toggle-btn ${val ? 'present' : 'absent'}`}
                                            >
                                                {val ? <Check size={16} /> : <Minus size={16} />}
                                            </button>
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                .full-page-matrix {
                    max-height: 70vh;
                    overflow: auto;
                }
.sticky-col {
        position: sticky;
        left: 0;
        z-index: 20;
        min-width: 300px;
        border-right: 2px solid #e2e8f0 !important;
        padding: 12px 20px;
    }
            .lec-column-header {
        position: relative; /* عشان نثبت الزرار جواه */
        transition: background 0.3s;
    }
                    .lec-header-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
    }


    .lec-delete-btn-overlay {
        position: absolute;
        top: -15px; 
        right: -12px;
        background: #fee2e2;
        color: #ef4444;
        border: none;
        padding: 4px;
        width:25px;
        height:25px;
        border-radius: 40px;
        cursor: pointer;
        opacity: 0;
        transition: all 0.2s ease;
        transform: scale(0.8);
    }

    /* يظهر فقط عند الوقوف على رأس العمود */
    .lec-column-header:hover .lec-delete-btn-overlay {
        opacity: 1;
        top: -8px;
        transform: scale(1);
    }

    .lec-delete-btn-overlay:hover {
        background: #ef4444;
        color: white;
    }
                
                .att-toggle-btn.present {
                    background: #dcfce7;
                    color: #166534;
                    border-color: #bbf7d0;
                }
                .att-toggle-btn.absent {
                    background: #fff;
                    color: #cbd5e1;
                }
                .att-toggle-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .search-wrapper-mini {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #ffffff;
                    padding: 8px 12px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                }
                .search-wrapper-mini input {
                    border: none;
                    background: transparent;
                    outline: none;
                    font-size: 14px;
                }
                @media print {
                    .back-btn-round, .header-actions, .lec-delete-btn, .insight-card:last-child {
                        display: none !important;
                    }
                }
            `}} />
        </div>
    );
};

export default AttendanceManagement;