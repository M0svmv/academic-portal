import React, { useEffect, useState } from "react";
import api from "../services/api";
import { FaTimes, FaClock } from "react-icons/fa";

const StudentScheduleModal = ({ isOpen, onClose, studentId }) => {
    const [scheduleData, setScheduleData] = useState(null);
    const [loading, setLoading] = useState(false);
    const daysOfWeek = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

    useEffect(() => {
        if (!isOpen || !studentId) return;

        const fetchSchedule = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/schedule/student/${studentId}`);
                setScheduleData(res.data);
            } catch (err) {
                console.error("Failed to fetch schedule", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
    }, [isOpen, studentId]);

    if (!isOpen) return null;

    return (
        <div
            className="modal-overlay"
            style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: "rgba(0,0,0,0.7)", display: "flex",
                alignItems: "center", justifyContent: "center", zIndex: 1000,
            }}
        >
            <div
                className="modal-content"
                style={{
                    backgroundColor: "#fff", color: "#000", width: "95%",
                    maxWidth: "1400px", maxHeight: "90vh", borderRadius: "12px",
                    overflow: "hidden", display: "flex", flexDirection: "column",
                }}
            >
                {/* Header */}
                <div style={{
                    padding: "20px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "1.2rem" }}>Academic Schedule</h3>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#2c2f36" }}>
                            {scheduleData?.student?.studentName} ({scheduleData?.student?._id})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: "1.2rem" }}
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Body */}
                <div className="sc-table-wrapper">
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "40px" }}>
                            <div className="loader"></div>
                        </div>
                    ) : scheduleData ? (
                        <table className="modern-schedule-table">
                            <thead>
                                <tr>
                                    <th style={{
                                        backgroundColor: "var(--primary-blue-color)", color: "#f8fafc",
                                        padding: "15px", borderRadius: "8px", minWidth: "100px",
                                    }}>
                                        Days
                                    </th>
                                    {[...Array(6)].map((_, i) => {
                                        const pIdx = i * 2;
                                        const periods = scheduleData.schedule?.periodsTime || [];
                                        const pStart = periods[pIdx];
                                        const pEnd = periods[pIdx + 1] || pStart;
                                        return (
                                            <th key={i} style={{
                                                backgroundColor: "var(--primary-blue-color)",
                                                padding: "10px", borderRadius: "8px",
                                            }}>
                                                <div style={{ fontSize: "0.9rem", color: "#fff" }}>Session {i + 1}</div>
                                                <div style={{ fontSize: "0.75rem", color: "#f8fafc", marginTop: "4px" }}>
                                                    {pStart?.startTime || "-"} - {pEnd?.endTime || "-"}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {daysOfWeek.map((day) => (
                                    <tr key={day}>
                                        <td style={{
                                            backgroundColor: "#f9fafc", padding: "20px",
                                            borderRadius: "8px", textAlign: "center",
                                            fontWeight: "bold", fontSize: "0.9rem",
                                        }}>
                                            {day}
                                        </td>
                                        {[...Array(6)].map((_, i) => {
                                            const currentSessionNumber = i + 1;
                                            const courses = scheduleData.offerings?.filter(
                                                (o) =>
                                                    o.schedule?.days?.includes(day) &&
                                                    Math.ceil(Number(o.schedule.lecPeriod) / 2) === currentSessionNumber
                                            ) || [];

                                            return (
                                                <td key={i} style={{
                                                    backgroundColor: "#f8fafc", borderRadius: "10px",
                                                    height: "100px", verticalAlign: "middle", padding: "8px",
                                                }}>
                                                    {courses.map((course, idx) => (
                                                        <div key={idx} style={{
                                                            backgroundColor: "rgba(78, 115, 223, 0.1)",
                                                            borderLeft: "4px solid #4e73df",
                                                            padding: "8px", borderRadius: "4px", marginBottom: "4px",
                                                        }}>
                                                            <div style={{ fontSize: "0.7rem", color: "#4e73df", fontWeight: "bold" }}>
                                                                #{course.courseId?._id}
                                                            </div>
                                                            <div style={{ fontSize: "0.8rem", margin: "3px 0", fontWeight: "600" }}>
                                                                {course.courseId?.courseName}
                                                            </div>
                                                            <div style={{ fontSize: "0.65rem", color: "#aaa", display: "flex", alignItems: "center", gap: "4px" }}>
                                                                <FaClock size={10} /> {course.schedule?.lecLength} Periods
                                                            </div>
                                                        </div>
                                                    ))}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: "center", color: "#666", padding: "40px" }}>
                            No schedule found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentScheduleModal;