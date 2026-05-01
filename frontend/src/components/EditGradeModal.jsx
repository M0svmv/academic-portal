import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import swalService from "../services/swal";

const EditGradeModal = ({ isOpen, onClose, onSave, courseData }) => {
    const [grade, setGrade] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (courseData) {
            // التعامل مع الـ grade سواء كان رقم مباشر أو object (في حالة semester works)
            const currentGrade = typeof courseData.grade === 'object'
                ? courseData.grade.totalGrade
                : courseData.grade;

            setGrade(currentGrade || '');
            setError('');
        }
    }, [courseData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const gradeNum = parseFloat(grade);
        if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
            setError('Please enter a valid grade between 0 and 100.');
            return;
        }

        setLoading(true);
        try {
            const courseId = courseData.courseId?._id;
            await onSave(courseId, gradeNum);

            swalService.success("Updated", "Grade has been updated successfully.");
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to update grade. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !courseData) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <h3>Update Grade</h3>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="course-info-display">
                            <p className="value">{courseData.courseId?.courseName}</p>
                            <p className="sub-value">{courseData.courseId?._id}</p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="grade">Grade (0 - 100)</label>
                            <input
                                type="number"
                                id="grade"
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                placeholder="e.g. 85.5"
                                step="0.1"
                                min="0"
                                max="100"
                                required
                                autoFocus
                            />
                        </div>

                        {error && <p className="error-message-inline" style={{ color: 'red', fontSize: '0.85rem' }}>{error}</p>}
                    </div>

                    <footer className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-1" disabled={loading}>
                            {loading ? (
                                <span className="spinner-border spinner-border-sm"></span>
                            ) : (
                                <><Save size={16} /> Save Changes</>
                            )}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default EditGradeModal;