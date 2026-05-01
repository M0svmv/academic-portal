import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';
import swalService from "../services/swal";
import '../pages/styles/ProgramCourses.css';

const COURSE_TYPES = [
    "Core", "Program Elective",
    "General Elective 1", "General Elective 2", "General Elective 3",
    "Engineering Economy Elective", "Project Management Elective",
    "Engineering Physics Elective", "Engineering Mathematics Elective",
    "graduation-project",
    "training",
];

const COURSE_LEVELS = ["freshman", "sophomore", "junior", "senior-1", "senior-2","senior"];

const COURSE_REGULATION = ["New", "Last"]

const CourseModal = ({ isOpen, onClose, onSave, initialData = null }) => {
    const [formData, setFormData] = useState({
        _id: '',
        courseName: '',
        courseCredits: 3,
        courseLevel: 'freshman',
        courseRegulation: 'New',
        courseType: 'Core',
        prerequisiteCourses: []
    });

    const [allCourses, setAllCourses] = useState([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchCourses();

            if (initialData) {
                setFormData({
                    ...initialData,
                    prerequisiteCourses: initialData.prerequisiteCourses || []
                });
            } else {
                setFormData({
                    _id: '',
                    courseName: '',
                    courseCredits: 3,
                    courseLevel: 'freshman',
                    courseRegulation: 'New',
                    courseType: 'Core',
                    prerequisiteCourses: []
                });
            }
        }
    }, [initialData, isOpen]);

    const fetchCourses = async () => {
        try {
            const res = await api.get("/courses");
            setAllCourses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    /* ======================
       Add / Remove Prereq
    ====================== */
    const addPrereq = (id) => {
        if (!formData.prerequisiteCourses.includes(id)) {
            setFormData({
                ...formData,
                prerequisiteCourses: [...formData.prerequisiteCourses, id]
            });
        }
        setSearch('');
    };

    const removePrereq = (id) => {
        setFormData({
            ...formData,
            prerequisiteCourses: formData.prerequisiteCourses.filter(c => c !== id)
        });
    };

    const filteredCourses = allCourses.filter(c =>
        c._id.toLowerCase().includes(search.toLowerCase()) &&
        !formData.prerequisiteCourses.includes(c._id) &&
        c._id !== formData._id
    );

    /* ======================
       Submit
    ====================== */
    const handleSubmit = (e) => {
        e.preventDefault();

        onSave({
            ...formData,
            courseCredits: Number(formData.courseCredits)
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-card">

                <div className="modal-head">
                    <h3>{initialData ? 'Edit Course' : 'Add Course'}</h3>
                    <X onClick={onClose} style={{ cursor: 'pointer' }} />
                </div>

                <div className="modal-body">
                    <form id="courseForm" onSubmit={handleSubmit}>

                        {/* ID */}
                        <div className="form-group">
                            <label>Course ID</label>
                            <input
                                required
                                value={formData._id}
                                onChange={e => setFormData({ ...formData, _id: e.target.value })}
                            />
                        </div>

                        {/* Name */}
                        <div className="form-group">
                            <label>Course Name</label>
                            <input
                                required
                                value={formData.courseName}
                                onChange={e => setFormData({ ...formData, courseName: e.target.value })}
                            />
                        </div>

                        {/* Credits + Type */}
                        <div style={{ gap: '10px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Credits</label>
                                <input
                                    type="number"
                                    value={formData.courseCredits}
                                    onChange={e => setFormData({ ...formData, courseCredits: e.target.value })}
                                />
                            </div>

                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Type</label>
                                <select
                                    value={formData.courseType}
                                    onChange={e => setFormData({ ...formData, courseType: e.target.value })}
                                >
                                    {COURSE_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Course Regulation</label>
                            <select
                                value={formData.courseRegulation}
                                onChange={e => setFormData({ ...formData, courseRegulation: e.target.value })}
                            >
                                {COURSE_REGULATION.map(l => <option key={l}>{l}</option>)}
                            </select>
                        </div>

                        {/* 🔥 LEVEL */}
                        <div className="form-group">
                            <label>Course Level</label>
                            <select
                                value={formData.courseLevel}
                                onChange={e => setFormData({ ...formData, courseLevel: e.target.value })}
                            >
                                {COURSE_LEVELS.map(l => <option key={l}>{l}</option>)}
                            </select>
                        </div>


                        {/* 🔥 PREREQUISITES (CHIPS UI) */}
                        <div className="form-group">
                            <label>Prerequisites</label>

                            {/* Selected Chips */}
                            <div className="chips-container">
                                {formData.prerequisiteCourses.map(id => (
                                    <span key={id} className="chip">
                                        {id}
                                        <button type="button" onClick={() => removePrereq(id)}>×</button>
                                    </span>
                                ))}
                            </div>

                            {/* Search */}
                            <input
                                placeholder="Search course..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />

                            {/* Dropdown */}
                            {search && (
                                <div className="dropdown-list">
                                    {filteredCourses.map(c => (
                                        <div
                                            key={c._id}
                                            className="dropdown-item"
                                            onClick={() => addPrereq(c._id)}
                                        >
                                            {c._id} - {c.courseName}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </form>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" form="courseForm" className="btn-1">
                        {initialData ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        </div >
    );
};

export default CourseModal;