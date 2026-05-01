import { useState, useEffect } from "react";
import api from "../services/api";
import "./SemesterModal.css";
import { Calendar, Clock, X } from "lucide-react";
import swalService from "../services/swal";

const SemesterModal = ({ show, onClose, onSuccess }) => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

    // --- States ---
    const [term, setTerm] = useState("Fall");
    const [year, setYear] = useState(currentYear);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Timeline States (Pre-Reg, Add/Drop, Finals)
    const [preReg, setPreReg] = useState({ start: "", end: "" });
    const [addDrop, setAddDrop] = useState({ start: "", end: "" });
    const [finalExams, setFinalExams] = useState({ start: "", end: "" });

    // --- Helpers ---
    const addDays = (dateStr, days) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    };

    // --- Auto-fill Logic ---
    useEffect(() => {
        if (startDate) {
            const pStart = startDate;
            const pEnd = addDays(startDate, 14);

            const aStart = addDays(pEnd, 1);
            const aEnd = addDays(aStart, 7);

            const fStart = addDays(startDate, 100);
            const fEnd = addDays(fStart, 10);

            setPreReg({ start: pStart, end: pEnd });
            setAddDrop({ start: aStart, end: aEnd });
            setFinalExams({ start: fStart, end: fEnd });
            setEndDate(addDays(fEnd, 2));
        }
    }, [startDate]);

    if (!show) return null;


    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. تجميع البيانات (Data Preparation)
        const data = {
            year: String(year),
            term: term.toLowerCase(),
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
            timeLine: {
                preRegistration: {
                    start: new Date(preReg.start).toISOString(),
                    end: new Date(preReg.end).toISOString()
                },
                addDrop: {
                    start: new Date(addDrop.start).toISOString(),
                    end: new Date(addDrop.end).toISOString()
                },
                finalExams: {
                    start: new Date(finalExams.start).toISOString(),
                    end: new Date(finalExams.end).toISOString()
                }
            },
            settings: {
                allowEnrollment: false,
                allowWithdrawal: false
            }
        };

        try {
            // 2. إظهار لودينج لأن إنشاء ترم جديد عملية تقيلة ومهمة
            swalService.showLoading("Launching new semester...");

            const res = await api.post("/semesters", data);

            // 3. تنبيه بالنجاح مع أيقونة الـ Rocket اللي إنت كنت حاططها
            await swalService.success("Congratulations!", "Semester Created Successfully! 🚀");

            onSuccess(res.data);
            onClose(); // قفل المودال بعد النجاح
        } catch (err) {
            // 4. معالجة الخطأ
            console.error(err);
            const errorMessage = err.response?.data?.message || "Error creating semester";
            swalService.error("Launch Failed", errorMessage);
        }
    };

    return (
        <div className="semester-modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <div className="header-title">
                        <h3>Start New Academic Semester</h3>
                    </div>
                    <button className="close-btn delete-btn" onClick={onClose}><X size={22} /></button>
                </div>
                <div className="modal-body">
                    <form id="semesterForm" onSubmit={handleSubmit} className="semester-form">
                        {/* Basic Info */}
                        <div className="form-row">
                            <div className="form-group">
                                <label>Academic Term</label>
                                <select value={term} onChange={(e) => setTerm(e.target.value)}>
                                    <option value="Spring">Spring</option>
                                    <option value="Summer">Summer</option>
                                    <option value="Fall">Fall</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Year</label>
                                <select value={year} onChange={(e) => setYear(e.target.value)}>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Semester Official Start Date</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                        </div>

                        {/* Timeline Configuration Section */}
                        <div className="timeline-section">
                            <h4><Clock size={16} /> Timeline Configuration</h4>

                            <div className="timeline-grid">
                                {/* Pre-Registration */}
                                <div className="timeline-item">
                                    <label>Pre-Registration Period</label>
                                    <div className="date-range-inputs">
                                        <input type="date" value={preReg.start} onChange={(e) => setPreReg({ ...preReg, start: e.target.value })} required />
                                        <span>to</span>
                                        <input type="date" value={preReg.end} onChange={(e) => setPreReg({ ...preReg, end: e.target.value })} required />
                                    </div>
                                </div>

                                {/* Add & Drop */}
                                <div className="timeline-item">
                                    <label>Add & Drop Period</label>
                                    <div className="date-range-inputs">
                                        <input type="date" value={addDrop.start} onChange={(e) => setAddDrop({ ...addDrop, start: e.target.value })} required />
                                        <span>to</span>
                                        <input type="date" value={addDrop.end} onChange={(e) => setAddDrop({ ...addDrop, end: e.target.value })} required />
                                    </div>
                                </div>

                                {/* Final Exams */}
                                <div className="timeline-item">
                                    <label>Final Exams Period</label>
                                    <div className="date-range-inputs">
                                        <input type="date" value={finalExams.start} onChange={(e) => setFinalExams({ ...finalExams, start: e.target.value })} required />
                                        <span>to</span>
                                        <input type="date" value={finalExams.end} onChange={(e) => setFinalExams({ ...finalExams, end: e.target.value })} required />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="form-group mt-10">
                            <label>Expected Semester End Date</label>
                            <input type="date" className="readonly-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                        </div>

                        <div className="modal-footer">
                            <button className="cancel-btn " type="button" onClick={onClose}>Cancel</button>
                            <button className="create-btn" type="submit">
                                Launch Semester
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SemesterModal;