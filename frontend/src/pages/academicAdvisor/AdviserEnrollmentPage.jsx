import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import swalService from "../../services/swal";
import {
    FaPlus,
    FaExclamationTriangle,
    FaCheckCircle,
    FaInfoCircle,
    FaArrowLeft
} from "react-icons/fa";
import { Trash2, X } from 'lucide-react';
import "../styles/StudentOfferings.css";

const AdviserEnrollmentPage = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();

    const [availableCourses, setAvailableCourses] = useState([]);
    const [originalEnrolled, setOriginalEnrolled] = useState([]);
    const [draftEnrolled, setDraftEnrolled] = useState([]);
    const [allowedCredits, setAllowedCredits] = useState(0);
    const [activeTab, setActiveTab] = useState("Freshman");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const levels = ["Freshman", "Sophomore", "Junior", "Senior"];

    // 1. Fetch Data on Mount
    useEffect(() => {
        fetchData();
    }, [studentId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // جلب الكورسات المتاحة
            const availableRes = await api.get(`/academic-advisors/me/students/available-courses/${studentId}`);
            setAvailableCourses(availableRes.data.availableOfferings || []);
            setAllowedCredits(availableRes.data.allowedCredits || 0);

            // جلب التسجيل الحالي
            const enrolledRes = await api.get(`/academic-advisors/me/students/current-enrollment/${studentId}`);
            const currentIds = enrolledRes.data?.courses?.map((c) => c.courseOfferingId._id) || [];

            setOriginalEnrolled(currentIds);

            // تحقق من وجود مسودة قديمة لهذا الطالب تحديداً في الـ LocalStorage
            const savedDraft = localStorage.getItem(`draft_${studentId}`);
            if (savedDraft) {
                setDraftEnrolled(JSON.parse(savedDraft));
            } else {
                setDraftEnrolled(currentIds);
            }
        } catch (err) {
            console.error(err);
            swalService.error("Error", "Failed to load student data");
        } finally {
            setLoading(false);
        }
    };

    // 2. Persist Draft to LocalStorage
    useEffect(() => {
        if (!loading) {
            localStorage.setItem(`draft_${studentId}`, JSON.stringify(draftEnrolled));
        }
    }, [draftEnrolled, loading, studentId]);

    // 3. Logic: Is Dirty & Credit Calculation
    const isDirty = useMemo(() => {
        if (loading) return false;
        const draftIds = [...draftEnrolled].sort().join(",");
        const originalIds = [...originalEnrolled].sort().join(",");
        return draftIds !== originalIds;
    }, [draftEnrolled, originalEnrolled, loading]);

    const currentTotalCredits = useMemo(() => {
        return draftEnrolled.reduce((sum, id) => {
            const offering = availableCourses.find((o) => o._id === id);
            return sum + (offering?.courseId?.courseCredits || 0);
        }, 0);
    }, [draftEnrolled, availableCourses]);

    const isLimitReached = currentTotalCredits >= allowedCredits;

    // 4. Prevent accidental navigation
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = "You have unsaved changes!";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    // 5. Actions
    const addCourse = (id) => {
        const courseToAdd = availableCourses.find(c => c._id === id);
        const creditsOfCourse = courseToAdd?.courseId?.courseCredits || 0;

        if (!draftEnrolled.includes(id)) {
            if (currentTotalCredits + creditsOfCourse > allowedCredits) {
                swalService.error("Limit Exceeded", `Student credit limit is ${allowedCredits}.`);
                return;
            }
            setDraftEnrolled([...draftEnrolled, id]);
        }
    };

    const removeCourse = (id) => {
        setDraftEnrolled(draftEnrolled.filter((c) => c !== id));
    };

    const saveEnrollment = async () => {
        const result = await swalService.confirm(
            "Confirm Enrollment",
            `Are you sure you want to update enrollment for student #${studentId}? Total credits: ${currentTotalCredits}`,
            "Confirm Changes"
        );

        if (!result.isConfirmed) return;

        setSaving(true);
        swalService.showLoading("Updating student enrollment...");

        try {
            const payload = {
                courses: draftEnrolled.map((id) => ({ courseOfferingId: id }))
            };

            await api.post(`/academic-advisors/me/students/enroll/${studentId}`, payload);

            setOriginalEnrolled([...draftEnrolled]);
            localStorage.removeItem(`draft_${studentId}`);

            swalService.success("Updated!", "Student enrollment has been updated successfully.");
        } catch (err) {
            swalService.error("Failed", err.response?.data?.error || "Enrollment update failed");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-container">Loading Student Data...</div>;

    return (
        <div className="management-container student-offerings-container">
            {/* Navigation Header */}

            <div className="prereg-header header">
                <div className="header-left">
                    <button className="back-btn-round" onClick={() => window.history.back()}><FaArrowLeft /></button>
                    <div className="title-info">
                        <h2>Enroll: Student #{studentId}</h2>
                    </div>
                </div>
                <div>
                    {isDirty ? (
                        <div className="status-alert warning"><FaExclamationTriangle /> Unsaved Changes</div>
                    ) : (
                        <div className="status-alert success"><FaCheckCircle /> Everything is Up to date</div>
                    )}
                </div>
            </div>

            {/* Credit Progress Card */}
            <div className={`credit-info-card ${isLimitReached ? "limit-reached" : ""}`}>
                <div className="credit-text">
                    <FaInfoCircle />
                    <span>Total Credits: <strong>{currentTotalCredits}</strong> / {allowedCredits}</span>
                </div>
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min((currentTotalCredits / allowedCredits) * 100, 100)}%` }}></div>
                </div>
            </div>

            {/* Available Offerings Section */}
            <div className="section">
                <h3>Available Courses ({activeTab})</h3>
                <div className="tabs-navigation">
                    {levels.map(level => (
                        <button
                            key={level}
                            className={`tab-item ${activeTab === level ? "active" : ""}`}
                            onClick={() => setActiveTab(level)}
                        >
                            {level}
                        </button>
                    ))}
                </div>

                <div className="table-wrapper">
                    <table className="offerings-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Credits</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {availableCourses
                                .filter(o => o.courseId.courseLevel?.toLowerCase() === activeTab.toLowerCase())
                                .map((offering) => {
                                    const isInDraft = draftEnrolled.includes(offering._id);
                                    const credits = offering.courseId.courseCredits;
                                    const isDisabled = !isInDraft && (currentTotalCredits + credits > allowedCredits);

                                    return (
                                        <tr key={offering._id} className={isInDraft ? "row-selected" : ""}>
                                            <td>{offering.courseId._id}</td>
                                            <td>{offering.courseId.courseName}</td>
                                            <td>{credits}</td>
                                            <td>
                                                <span className={`status-badge ${offering.status?.toLowerCase() || 'open'}`}>
                                                    {offering.status || "Open"}
                                                </span>
                                            </td>
                                            <td>
                                                {isInDraft ? (
                                                    <button className="action-btn remove-in-table" onClick={() => removeCourse(offering._id)}>
                                                        <X size={18} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="action-btn add-in-table"
                                                        onClick={() => addCourse(offering._id)}
                                                        disabled={isDisabled}
                                                    >
                                                        <FaPlus size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Draft / Current Selection Section */}
            <div className="section">
                <h3>Current Enrollment</h3>
                <div className="table-wrapper">
                    <table className="offerings-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Credits</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {draftEnrolled.length === 0 ? (
                                <tr>
                                    <td colSpan="4">
                                        <p className="empty-msg" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                                            No courses selected for this student.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                draftEnrolled.map((id) => {
                                    const offering = availableCourses.find(o => o._id === id);
                                    if (!offering) return null;
                                    return (
                                        <tr key={id}>
                                            <td>{offering.courseId._id}</td>
                                            <td>{offering.courseId.courseName}</td>
                                            <td>{offering.courseId.courseCredits}</td>
                                            <td>
                                                <button className="remove-btn" onClick={() => removeCourse(id)}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <button
                    className={`btn-1 save-btn ${isDirty ? "active" : ""}`}
                    onClick={saveEnrollment}
                    disabled={!isDirty || saving}
                >
                    {saving ? "Saving Changes..." : "Confirm & Save Enrollment"}
                </button>
            </div>
        </div >
    );
};

export default AdviserEnrollmentPage;