import { useState } from "react";
import api from "../services/api";
import swalService from "../services/swal";

const EditTimelineModal = ({ show, type, currentDates, semesterId, onClose, onSuccess }) => {
    const [dates, setDates] = useState({
        start: currentDates?.start ? new Date(currentDates.start).toISOString().split('T')[0] : "",
        end: currentDates?.end ? new Date(currentDates.end).toISOString().split('T')[0] : ""
    });

    const handleUpdate = async (e) => {
        e.preventDefault();

        // 1. التحقق من أن التاريخ مش فاضي قبل ما نبعت
        if (!dates.start || !dates.end) {
            return swalService.error("Missing Dates", "Please select both start and end dates.");
        }

        try {
            // إظهار لودينج بسيط عشان المستخدم يحس إن فيه أكشن بيحصل
            swalService.showLoading("Updating dates...");

            const payload = {
                start: new Date(dates.start).toISOString(),
                end: new Date(dates.end).toISOString()
            };

            await api.put(`/semesters/${semesterId}/${type}`, payload);

            // 2. تنبيه بالنجاح
            await swalService.success("Updated!", "Timeline has been updated successfully.");

            onSuccess(); // تحديث البيانات في الصفحة الأساسية
            onClose();   // قفل المودال
        } catch (err) {
            // 3. معالجة الخطأ بشكل نضيف
            console.error("Update Error:", err);
            const errorMessage = err.response?.data?.message || "Something went wrong while updating dates.";
            swalService.error("Update Failed", errorMessage);
        }
    };

    if (!show) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-container" style={{ width: '350px' }}>
                <div className="modal-header">
                    <h4>Edit {type.replace(/([A-Z])/g, ' $1')}</h4>
                    <button onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleUpdate} className="semester-form">
                    <div className="form-group">
                        <label>Start Date</label>
                        <input
                            type="date"
                            value={dates.start}
                            onChange={(e) => setDates({ ...dates, start: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>End Date</label>
                        <input
                            type="date"
                            value={dates.end}
                            onChange={(e) => setDates({ ...dates, end: e.target.value })}
                        />
                    </div>
                    <button type="submit" className="create-btn">Update Timeline</button>
                </form>
            </div>
        </div>
    );
};

export default EditTimelineModal;