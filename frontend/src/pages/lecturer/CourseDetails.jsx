import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    BookOpen, Calendar, Award, ChevronLeft, Info, ListChecks,
    Users, Clock, Layers, ShieldCheck, FileText, CheckCircle2
} from 'lucide-react';
import api from "../../services/api";
import '../styles/ProgramCourses.css';

const CourseDetails = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await api.get(`/lecturers/me/courses/${courseId}`);
                setData(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching course details", err);
                setLoading(false);
            }
        };
        fetchDetails();
    }, [courseId]);

    if (loading) return <div className="management-container">Loading...</div>;
    if (!data) return <div className="management-container">Course not found.</div>;

    const { course } = data;

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="prereg-header">
                    <button className="btn-cancel" onClick={() => navigate(-1)} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ChevronLeft size={16} /> Back to Courses
                    </button>
                    <h2>{course.courseId?.courseName} <span style={{ color: '#94a3b8', fontSize: '0.6em' }}>[{course.courseId?._id}]</span></h2>
                </div>
            </header>

            {/* 1. Main Stats Grid */}
            <div className="insights-grid">
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-blue"><Users size={18} /></span>
                        <span className="insight-label">Enrollment</span>
                    </div>
                    <div className="insight-value">{course.enrolledCount}</div>
                    <div className="insight-footer">{course.graduatesEnrolledCount} Graduates included</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-green"><Layers size={18} /></span>
                        <span className="insight-label">Course Level</span>
                    </div>
                    <div className="insight-value" style={{ textTransform: 'capitalize' }}>{course.courseId?.courseLevel}</div>
                    <div className="insight-footer">{course.courseId?.courseCredits} Credits • {course.courseId?.courseType}</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-orange"><Clock size={18} /></span>
                        <span className="insight-label">Weekly Load</span>
                    </div>
                    <div className="insight-value">{course.lecNum + course.labNum} Hrs</div>
                    <div className="insight-footer">{course.lecNum} Lectures • {course.labNum} Labs</div>
                </div>
            </div>

            {/* 2. Detailed Info Sections */}
            <div className="table-wrapper" style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>

                {/* Academic Context */}
                <div className="details-section shadow-sm">
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
                        <ShieldCheck size={20} color="#1d4ed8" /> Academic Context
                    </h3>
                    <div className="info-item">
                        <label>Regulation:</label>
                        <span>{course.courseId?.courseRegulation} Edition</span>
                    </div>
                    <div className="info-item">
                        <label>Semester:</label>
                        <span style={{ textTransform: 'capitalize' }}>{course.semesterId?.replace('-', ' ')}</span>
                    </div>
                    <div className="info-item">
                        <label>Status:</label>
                        <span className={`type-badge ${course.status === 'proposed' ? 'icon-orange' : 'icon-green'}`}>{course.status}</span>
                    </div>
                    <div className="info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', marginTop: '15px' }}>
                        <label style={{ marginBottom: '8px' }}>Prerequisite Courses:</label>
                        {course.courseId?.prerequisiteCourses?.length > 0 ? (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {course.courseId.prerequisiteCourses.map(pre => (
                                    <span key={pre} className="type-badge" style={{ backgroundColor: '#f1f5f9', color: 'var( --primary-blue-color)' }}>{pre}</span>
                                ))}
                            </div>
                        ) : (
                            <span style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }}>No prerequisites required</span>
                        )}
                    </div>
                </div>

                {/* Grading Breakdown */}
                <div className="details-section shadow-sm">
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
                        <ListChecks size={20} color="#059669" /> Grading Schema Breakdown
                    </h3>
                    <div className="schema-grid">
                        {Object.entries(course.gradingSchema || {}).map(([key, value]) => (
                            <div key={key} className="schema-row">
                                <span className="schema-key">{key.replace(/([A-Z])/g, ' $1')}</span>
                                <div className="schema-progress-container">
                                    <div className="schema-progress-bar" style={{ width: `${(value / 100) * 200}%` }}></div>
                                    <span className="schema-value">{value}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* 3. Dates & Schedule Section */}
                <div className="table-wrapper" style={{ padding: '24px', marginTop: '24px' }}>
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={20} color="#ef4444" /> Scheduled Dates
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>

                        {/* Lecture Dates */}
                        <div>
                            <h4 style={{ fontSize: '15px', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BookOpen size={16} /> Lecture Sessions
                            </h4>
                            {course.lecDates?.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {course.lecDates.map((date, index) => (
                                        <div key={index} className="type-badge" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' }}>
                                            {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: '#94a3b8', fontSize: '13px' }}>No lecture dates scheduled yet.</p>
                            )}
                        </div>

                        {/* Lab Dates */}
                        <div>
                            <h4 style={{ fontSize: '15px', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={16} /> Lab Sessions
                            </h4>
                            {course.labDates?.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {course.labDates.map((date, index) => (
                                        <div key={index} className="type-badge" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7' }}>
                                            {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: '#94a3b8', fontSize: '13px' }}>No lab dates scheduled yet.</p>
                            )}
                        </div>

                    </div>
                </div>
                {/* Schedule & Metadata */}
                <div className="details-section shadow-sm">
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
                        <FileText size={20} color="#7c3aed" /> System Metadata
                    </h3>
                    <div className="info-item">
                        <label>Instructor ID:</label>
                        <code>{course.instructorId}</code>
                    </div>
                    <div className="info-item">
                        <label>TA Assigned:</label>
                        <span>{course.taId || "None Assigned"}</span>
                    </div>
                    <div className="info-item">
                        <label>Last Updated:</label>
                        <span>{new Date(course.courseId?.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="info-item">
                        <label>Version:</label>
                        <span>v{course.__v}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseDetails;