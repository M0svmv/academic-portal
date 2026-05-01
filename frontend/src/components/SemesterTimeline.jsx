import React, { useState } from "react";
import { Edit2, X } from "lucide-react";
import api from "../services/api";
import swalService from "../services/swal";
import "./styles/SemesterTimeline.css";

const SemesterTimeline = ({ startDate, endDate, timeLine, semesterId, onUpdate }) => {
    // حالة المودال (مخفي/ظاهر) والبيانات اللي جواه
    const [editModal, setEditModal] = useState({
        show: false,
        type: "",
        dates: { start: "", end: "" }
    });

    const today = new Date();

    // مصفوفة الأحداث مرتبة زمنياً لحساب التقدم وتوزيع النقط
    const academicEvents = [
        { name: "Semester Start", date: new Date(startDate), isBoundary: true },
        { name: "Pre-Registration", key: "preRegistration", dates: timeLine?.preRegistration, date: new Date(timeLine?.preRegistration?.start) },
        { name: "Add / Drop", key: "addDrop", dates: timeLine?.addDrop, date: new Date(timeLine?.addDrop?.start) },
        { name: "Final Exams", key: "finalExams", dates: timeLine?.finalExams, date: new Date(timeLine?.finalExams?.start) },
        { name: "Semester End", date: new Date(endDate), isBoundary: true }
    ];

    // دالة حساب التقدم الذكي بين النقط الثابتة (Space Between)
    const calculateProgress = () => {
        const totalPoints = academicEvents.length;
        const segmentWidth = 100 / (totalPoints - 1); // كل قسم يمثل 25% من الشريط

        for (let i = 0; i < totalPoints - 1; i++) {
            const currentEventDate = academicEvents[i].date;
            const nextEventDate = academicEvents[i + 1].date;

            if (today >= currentEventDate && today <= nextEventDate) {
                const timePassedInSegment = today - currentEventDate;
                const segmentTotalDuration = nextEventDate - currentEventDate;
                const segmentProgress = timePassedInSegment / segmentTotalDuration;

                return (i * segmentWidth) + (segmentProgress * segmentWidth);
            }
        }

        if (today > academicEvents[totalPoints - 1].date) return 100;
        return 0;
    };

    const progressPercentage = calculateProgress();

    const format = (dateStr) => {
        if (!dateStr || isNaN(new Date(dateStr))) return "N/A";
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short'
        });
    };

    const isActive = (startStr, endStr) => {
        if (!startStr || !endStr) return false;
        const s = new Date(startStr);
        const e = new Date(endStr);
        return today >= s && today <= e;
    };

    // فتح مودال التعديل وتجهيز التواريخ بصيغة YYYY-MM-DD للـ input
    const openEdit = (type, dates) => {
        setEditModal({
            show: true,
            type,
            dates: {
                start: dates?.start ? new Date(dates.start).toISOString().split('T')[0] : "",
                end: dates?.end ? new Date(dates.end).toISOString().split('T')[0] : ""
            }
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();

        // 1. التحقق من المنطق
        if (new Date(editModal.dates.start) > new Date(editModal.dates.end)) {
            return swalService.error("Invalid Dates", "End date cannot be earlier than start date.");
        }

        try {
            // 2. إظهار لودينج
            swalService.showLoading("Updating timeline...");

            const payload = {
                start: new Date(editModal.dates.start).toISOString(),
                end: new Date(editModal.dates.end).toISOString()
            };

            await api.put(`/semesters/${semesterId}/${editModal.type}`, payload);

            // 3. رسالة نجاح سريعة
            await swalService.success("Timeline Updated", `The ${editModal.type} period has been updated.`);

            setEditModal({ ...editModal, show: false });
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error("Update Error:", err);
            const errorMessage = err.response?.data?.message || "Something went wrong while updating the dates.";
            swalService.error("Update Failed", errorMessage);
        }
    };

    return (
        <div className="timeline-wrapper">
            <h3>Semester Timeline</h3>
            <div className="timeline-container">
                {/* شريط التقدم الخلفي */}
                <div className="timeline-line">
                    <div className="timeline-progress" style={{ width: `${progressPercentage}%` }}></div>
                </div>

                {/* توزيع النقط بـ Space Between */}
                <div className="timeline-events">
                    {academicEvents.map((event, i) => {
                        const isReached = today >= event.date;
                        const isCurrentActive = event.dates ? isActive(event.dates.start, event.dates.end) : false;

                        return (
                            <div key={i} className={`timeline-point ${isReached ? "reached" : ""} ${isCurrentActive ? "active" : ""}`}>

                                {/* أيقونة التعديل تظهر فقط للأحداث القابلة للتعديل */}
                                {event.key && (
                                    <button className="edit-timeline-btn" onClick={() => openEdit(event.key, event.dates)}>
                                        <Edit2 size={12} />
                                    </button>
                                )}

                                <span></span>

                                <div className="label-content">
                                    <h4>{event.name}</h4>
                                    {event.isBoundary ? (
                                        <small>{format(event.date)}</small>
                                    ) : (
                                        <p>{format(event.dates?.start)} — {format(event.dates?.end)}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* مودال التعديل الداخلي */}
            {editModal.show && (
                <div className="modal-overlay" style={{ zIndex: 2000 }}>
                    <div className="modal-container" style={{ width: '400px' }}>
                        <div className="modal-header">
                            <h4 style={{ textTransform: 'capitalize' }}>
                                Edit {editModal.type.replace(/([A-Z])/g, ' $1')}
                            </h4>
                            <button className="close-btn" onClick={() => setEditModal({ ...editModal, show: false })}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="semester-form">
                            <div className="form-group">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    value={editModal.dates.start}
                                    onChange={(e) => setEditModal({ ...editModal, dates: { ...editModal.dates, start: e.target.value } })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    value={editModal.dates.end}
                                    onChange={(e) => setEditModal({ ...editModal, dates: { ...editModal.dates, end: e.target.value } })}
                                    required
                                />
                            </div>
                            <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="cancel-btn" onClick={() => setEditModal({ ...editModal, show: false })}>
                                    Cancel
                                </button>
                                <button type="submit" className="create-btn">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SemesterTimeline;