import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import swalService from "../services/swal";
// import '../styles/Modals.css';

const AddCompletedCourseModal = ({ isOpen, onClose, onSave, transcriptId }) => {
    const [allCourses, setAllCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [grade, setGrade] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingCourses, setFetchingCourses] = useState(true);

    useEffect(() => {
        if (isOpen) {
            const fetchAllCourses = async () => {
                try {
                    const res = await api.get('/courses');
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

        if (!selectedCourse || !grade) {
            return swalService.error("Missing Data", "Please select a course and enter a grade");
        }

        setLoading(true);
        swalService.showLoading("Updating Transcript...");

        try {
            await api.put(`/transcripts/${transcriptId}/courses`, {
                completedCourses: [
                    { courseId: selectedCourse, grade: Number(grade) }
                ]
            });

            await swalService.success("Success!", "Course added to transcript successfully");

            onSave();
            onClose();

            setSelectedCourse('');
            setGrade('');
        } catch (err) {
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