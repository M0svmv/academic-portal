import React, { useState, useEffect } from 'react';
import { X, PlusCircle } from 'lucide-react';
import api from '../services/api';
import swalService from "../services/swal";
// import '../styles/Modals.css';

const AddCompletedCourseModal = ({ isOpen, onClose, onSave, transcriptId }) => {
    const [allCourses, setAllCourses] = useState([]); // لستة كل المواد في الكلية
    const [selectedCourse, setSelectedCourse] = useState('');
    const [grade, setGrade] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingCourses, setFetchingCourses] = useState(true);

    // تحميل لستة المواد أول ما المودال يفتح
    useEffect(() => {
        if (isOpen) {
            const fetchAllCourses = async () => {
                try {
                    const res = await api.get('/courses'); // تأكد من مسار الـ API ده عندك
                    setAllCourses(res.data?.data || res.data || []);
                } catch (err) {
                    console.error("Error fetching courses:", err);
                } finally {
                    setFetchingCourses(false);
                }
            };
            fetchAllCourses();
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. التحقق من البيانات باستخدام swalService.error
        if (!selectedCourse || !grade) {
            return swalService.error("Missing Data", "Please select a course and enter a grade");
        }

        setLoading(true);
        // 2. إظهار علامة التحميل (اختياري لأنك عامل Loading على الزرار، بس دي شكلها أشيك)
        swalService.showLoading("Updating Transcript...");

        try {
            await api.put(`/transcripts/${transcriptId}/courses`, {
                completedCourses: [
                    { courseId: selectedCourse, grade: Number(grade) }
                ]
            });

            // 3. تنبيه بالنجاح
            await swalService.success("Success!", "Course added to transcript successfully");

            onSave(); // ريفريش للداتا في الصفحة الأم
            onClose(); // قفل المودال

            // ريست للفورم
            setSelectedCourse('');
            setGrade('');
        } catch (err) {
            // 4. تنبيه بالخطأ في حالة فشل الـ API
            const errorMessage = err.response?.data?.message || "Error adding course";
            swalService.error("Failed!", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <header className="modal-header">
                    <h3>Add Completed Course</h3>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Select Course</label>
                            {fetchingCourses ? (
                                <p>Loading courses...</p>
                            ) : (
                                <select
                                    value={selectedCourse}
                                    onChange={(e) => setSelectedCourse(e.target.value)}
                                    required
                                >
                                    <option value="">-- Choose a Course --</option>
                                    {allCourses.map(course => (
                                        <option key={course._id} value={course._id}>
                                            {course.courseName} ({course._id})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Grade (0 - 100)</label>
                            <input
                                type="number"
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                placeholder="Enter grade"
                                min="0"
                                max="100"
                                required
                            />
                        </div>
                    </div>

                    <footer className="modal-footer">
                        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-1" disabled={loading}>
                            {loading ? "Adding..." : <><PlusCircle size={16} /> Add to Transcript</>}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default AddCompletedCourseModal;