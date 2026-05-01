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

const CooEnrollmentPage = () => {
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
    const STORAGE_KEY = `draft_coo_${studentId}`;

    useEffect(() => {
        fetchData();
    }, [studentId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. جلب الكورسات المتاحة
            const availableRes = await api.get(`/enrollments/${studentId}/available-courses`);
            const available = availableRes.data.availableOfferings || [];
            setAvailableCourses(available);
            setAllowedCredits(availableRes.data.allowedCredits || 0);

            // 2. جلب التسجيل الحالي
            const enrolledRes = await api.get(`/enrollments/student/${studentId}`);

            // بناءً على الـ JSON اللي بعته: enrolledRes.data.courses
            const enrolledData = enrolledRes.data?.courses || [];

            // استخراج الـ IDs فقط لعمل المقارنة والـ Draft
            const currentIds = enrolledData.map((item) => {
                // لو الـ courseOfferingId عبارة عن Object ناخد منه الـ _id
                if (item.courseOfferingId && typeof item.courseOfferingId === 'object') {
                    return item.courseOfferingId._id;
                }
                return item.courseOfferingId;
            }).filter(id => !!id); // إزالة أي قيم undefined

            setOriginalEnrolled(currentIds);

            // 3. إدارة الـ LocalStorage (لو مفيش Draft متسجل ابدأ بالمواد الحالية)
            const savedDraft = localStorage.getItem(STORAGE_KEY);
            if (savedDraft) {
                setDraftEnrolled(JSON.parse(savedDraft));
            } else {
                setDraftEnrolled(currentIds);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            swalService.error("Error", "Failed to load student data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loading) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(draftEnrolled));
        }
    }, [draftEnrolled, loading, studentId]);

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

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = "Unsaved changes exist!";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    const addCourse = (id) => {
        const courseToAdd = availableCourses.find(c => c._id === id);
        const creditsOfCourse = courseToAdd?.courseId?.courseCredits || 0;

        if (!draftEnrolled.includes(id)) {
            if (currentTotalCredits + creditsOfCourse > allowedCredits) {
                swalService.error("Limit Exceeded", `Max credits allowed is ${allowedCredits}.`);
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
            "Coordinator Action",
            `Update enrollment for Student ID: ${studentId}?`,
            "Save Changes"
        );

        if (!result.isConfirmed) return;

        setSaving(true);
        swalService.showLoading("Processing...");

        try {
            // نرسل كل الـ IDs الموجودة في الـ Draft (اللي هي عبارة عن الحالي معدل عليه)
            const payload = {
                courses: draftEnrolled.map((id) => ({ courseOfferingId: id }))
            };

            await api.post(`/enrollments/enroll/${studentId}`, payload);

            setOriginalEnrolled([...draftEnrolled]);
            localStorage.removeItem(STORAGE_KEY);

            swalService.success("Success", "Enrollment updated successfully.");
        } catch (err) {
            swalService.error("Failed", err.response?.data?.message || "Update failed");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-container">Fetching Data (Coordinator View)...</div>;

    return (
        <div className="management-container">
            <div className="prereg-header header">
                <div className="header-left">
                    <button className="back-btn-round" onClick={() => navigate(-1)}><FaArrowLeft /></button>
                    <div className="title-info">
                        <h2>Enroll Student: #{studentId}</h2>
                    </div>
                </div>
                <div>
                    {isDirty ? (
                        <div className="status-alert warning"><FaExclamationTriangle /> Unsaved changes</div>
                    ) : (
                        <div className="status-alert success"><FaCheckCircle /> Everything is up to date</div>
                    )}
                </div>
            </div>

            <div className={`credit-info-card ${isLimitReached ? "limit-reached" : ""}`}>
                <div className="credit-text">
                    <FaInfoCircle />
                    <span>Credit Progress: <strong>{currentTotalCredits}</strong> / {allowedCredits}</span>
                </div>
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min((currentTotalCredits / allowedCredits) * 100, 100)}%` }}></div>
                </div>
            </div>

            <div className="section">
                <h3>Available for {activeTab}</h3>
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
                                .filter(o => o.courseId?.courseLevel?.toLowerCase() === activeTab.toLowerCase())
                                .map((offering) => {
                                    const isInDraft = draftEnrolled.includes(offering._id);
                                    const credits = offering.courseId?.courseCredits || 0;
                                    const isDisabled = !isInDraft && (currentTotalCredits + credits > allowedCredits);

                                    return (
                                        <tr key={offering._id} className={isInDraft ? "row-selected" : ""}>
                                            <td>{offering.courseId?._id}</td>
                                            <td>{offering.courseId?.courseName}</td>
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
                                        <p className="empty-msg" style={{ textAlign: 'center', padding: '20px' }}>
                                            No courses selected in current draft.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                draftEnrolled.map((id) => {
                                    const offering = availableCourses.find(o => o._id === id);
                                    if (!offering) return null;
                                    return (
                                        <tr key={id}>
                                            <td>{offering.courseId?._id}</td>
                                            <td>{offering.courseId?.courseName}</td>
                                            <td>{offering.courseId?.courseCredits}</td>
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
                    className={`save-btn ${isDirty ? "active" : ""}`}
                    onClick={saveEnrollment}
                    disabled={!isDirty || saving}
                >
                    {saving ? "Processing..." : "Save Enrollment"}
                </button>
            </div>
        </div>
    );
};

export default CooEnrollmentPage;