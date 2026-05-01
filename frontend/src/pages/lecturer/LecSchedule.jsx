import React, { useState, useEffect, useRef } from 'react';
import api from "../../services/api";
import { Clock, AlertCircle, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './LecSchedule.css';

const LecSchedule = () => {
    const [scheduleData, setScheduleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [isAnnounced, setIsAnnounced] = useState(false);
    const tableRef = useRef(null);

    const daysOfWeek = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

    useEffect(() => {
        const fetchLecSchedule = async () => {
            try {
                const res = await api.get('/lecturers/me/courses/schedule');
                if (res.data.schedule && res.data.schedule.length > 0) {
                    setScheduleData(res.data);
                    // التحقق من وجود isAnnounced أو اعتباره true افتراضياً
                    setIsAnnounced(res.data.schedule[0].isAnnounced ?? true);
                }
            } catch (err) {
                console.error("Error fetching schedule:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLecSchedule();
    }, []);

    const exportToPDF = async () => {
        if (!tableRef.current) return;
        setExporting(true);

        try {
            const canvas = await html2canvas(tableRef.current, {
                scale: 4,
                useCORS: true,
                backgroundColor: "#ffffff",
                onclone: (clonedDoc) => {
                    const container = clonedDoc.querySelector('.student-schedule-wrapper');
                    const table = clonedDoc.querySelector('.modern-schedule-table');
                    if (container) {
                        container.style.width = "1200px";
                        container.style.padding = "40px";
                    }
                    if (table) {
                        table.style.borderSpacing = "12px";
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'l',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const ratio = Math.min((pdfWidth - 10) / imgProps.width, (pdfHeight - 10) / imgProps.height);
            const w = imgProps.width * ratio;
            const h = imgProps.height * ratio;

            pdf.addImage(imgData, 'PNG', (pdfWidth - w) / 2, (pdfHeight - h) / 2, w, h);
            pdf.save("Lecturer_Schedule.pdf");
        } catch (error) {
            console.error("Export Error", error);
        } finally {
            setExporting(false);
        }
    };

    if (loading) return <div className="management-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>Loading your schedule...</div>;

    if (!isAnnounced || !scheduleData) {
        return (
            <div className="not-announced-container">
                <AlertCircle size={48} className="text-amber-500" />
                <h3>Schedule Under Review</h3>
                <p>The academic schedule hasn't been finalized yet. Please check back later.</p>
            </div>
        );
    }

    // ملاحظة: الـ API الخاص بالـ TA يرسل "courses"
    const { schedule, courses } = scheduleData;
    const periods = schedule[0].periodsTime;

    return (
        <div className="management-container student-schedule-wrapper">
            <div className="schedule-header">
                <div className="title-section">
                    <h2>My Academic Schedule</h2>
                </div>
                <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="status-badge">Finalized</div>
                    <button
                        className="btn-1"
                        onClick={exportToPDF}
                        disabled={exporting}
                        style={{ minWidth: '140px', justifyContent: 'center' }}
                    >
                        {exporting ? (
                            <><Loader2 size={18} className="animate-spin" /> Generating...</>
                        ) : (
                            <><Download size={18} /> Export PDF</>
                        )}
                    </button>
                </div>
            </div>

            <div className="sc-table-wrapper table-responsive sc-table-wrapper-student" ref={tableRef}>
                <table className="modern-schedule-table">
                    <thead>
                        <tr>
                            <th className="day-cell-header">Days</th>
                            {[...Array(6)].map((_, i) => {
                                const pIdx = i * 2;
                                const pStart = periods[pIdx];
                                const pEnd = periods[pIdx + 1] || pStart;
                                return (
                                    <th key={i}>
                                        <span className="session-name">Session {i + 1}</span>
                                        <span className="session-time">
                                            {pStart?.startTime} - {pEnd?.endTime}
                                        </span>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {daysOfWeek.map(day => (
                            <tr key={day}>
                                <td className="day-cell">{day}</td>
                                {[...Array(6)].map((_, i) => {
                                    const currentCourses = courses?.filter(o =>
                                        o.schedule?.days?.includes(day) &&
                                        Number(o.schedule.lecPeriod) === (i * 2 + 1)
                                    ) || [];

                                    return (
                                        <td key={i}>
                                            {currentCourses.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                                                    {currentCourses.map((course, idx) => (
                                                        <div className="course-card-mini" key={idx}>
                                                            <div>
                                                                <div className="course-code">#{course.courseId._id}</div>
                                                                <div className="course-name">{course.courseId.courseName}</div>
                                                            </div>
                                                            <div className="course-meta">
                                                                <Clock size={10} style={{ marginRight: '4px' }} />
                                                                <span>{course.schedule.lecLength}P</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LecSchedule;