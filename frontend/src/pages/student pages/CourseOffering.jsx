import { useEffect, useState, useMemo } from "react";
import api from "../../services/api";
import swalService from "../../services/swal";
import {
    FaPlus,
    FaExclamationTriangle,
    FaCheckCircle,
    FaInfoCircle,
    FaChevronDown,
    FaChevronUp,
    FaAward,
    FaMedal,
    FaTrophy,
    FaClock
} from "react-icons/fa";
import { AlertTriangle } from 'lucide-react';
import "../styles/StudentOfferings.css";
import {
    Trash2, X, Sparkles, Star, Plus
} from 'lucide-react';

const StudentCourseOfferingsPage = () => {
    const [availableCourses, setAvailableCourses] = useState([]);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [draftEnrolled, setDraftEnrolled] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [isRecVisible, setIsRecVisible] = useState(false);
    const [allowedCredits, setAllowedCredits] = useState(0);
    const [activeTab, setActiveTab] = useState("Freshman");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);


    const [semesterData, setSemesterData] = useState(null);
    const [timeLeft, setTimeLeft] = useState("");
    const [studentRegulation, setStudentRegulation] = useState("New");


    const levels = useMemo(() => {
        const allLevels = ["Freshman", "Sophomore", "Junior", "senior-1", "senior-2", "Senior"];
        if (studentRegulation === "New") {
            return allLevels.filter(l => l !== "senior-1" && l !== "senior-2");
        } else {
            return allLevels.filter(l => l !== "Senior");
        }
    }, [studentRegulation]);

    useEffect(() => {
        fetchData();
        fetchRecommendations();
        fetchStudentDetails();
    }, []);

    useEffect(() => {
        if (!loading) {
            localStorage.setItem("courseDraft", JSON.stringify(draftEnrolled));
        }
    }, [draftEnrolled, loading]);

    // كاونت داون لوقت انتهاء التسجيل
    useEffect(() => {
        const preRegEnd = semesterData?.timeLine?.preRegistration?.end;

        if (!preRegEnd) return;

        const interval = setInterval(() => {
            const end = new Date(preRegEnd).getTime();
            const now = new Date().getTime();
            const distance = end - now;

            if (distance < 0) {
                setTimeLeft("Pre-Registration Closed");
                clearInterval(interval);
            } else {
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [semesterData]);

    const isDirty = useMemo(() => {
        if (loading) return false;
        const draftIds = [...draftEnrolled].sort().join(",");
        const originalIds = [...enrolledCourses].sort().join(",");
        return draftIds !== originalIds;
    }, [draftEnrolled, enrolledCourses, loading]);

    const fetchStudentDetails = async () => {
        try {
            const res = await api.get("/student/me/details");
            setSemesterData(res.data.semester);
            console.log(res.data.semester)
            setStudentRegulation(res.data.transcript?.regulation || "New");
        } catch (err) {
            console.error("Error fetching student details:", err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const availableRes = await api.get("/student/me/available-courses");
            setAvailableCourses(availableRes.data.availableOfferings || []);
            setAllowedCredits(availableRes.data.allowedCredits || 18);

            const enrolledRes = await api.get("/student/me/enrollments/current");
            const data = enrolledRes.data;

            const currentIds = data?.courses?.map(
                (c) => typeof c.courseOfferingId === 'object' ? c.courseOfferingId._id : c.courseOfferingId
            ) || [];

            setEnrolledCourses(currentIds);
            setDraftEnrolled(currentIds);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecommendations = async () => {
        try {
            const res = await api.get("/student/me/recommendations");
            const sortedRecs = (res.data.recommendations || []).sort((a, b) => b.score - a.score);
            setRecommendations(sortedRecs);
        } catch (err) {
            console.error("Failed to fetch recommendations", err);
        }
    };

    const currentTotalCredits = useMemo(() => {
        return draftEnrolled.reduce((sum, id) => {
            const offering = availableCourses.find((o) => o._id === id);
            return sum + (offering?.courseId?.courseCredits || 0);
        }, 0);
    }, [draftEnrolled, availableCourses]);

    const isLimitReached = currentTotalCredits >= allowedCredits;

    const addCourse = (id) => {
        const courseToAdd = availableCourses.find(c => c._id === id);
        const creditsOfCourse = courseToAdd?.courseId?.courseCredits || 0;

        if (!draftEnrolled.includes(id)) {
            if (currentTotalCredits + creditsOfCourse > allowedCredits) {
                swalService.error(
                    "Limit Exceeded",
                    `Your credit limit is ${allowedCredits}. This course exceeds it.`
                );
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
            "Confirm Selection",
            `Are you sure you want to enroll in ${draftEnrolled.length} courses? Total credits: ${currentTotalCredits}`,
            "Confirm & Save"
        );

        if (!result.isConfirmed) return;

        setSaving(true);
        swalService.showLoading("Registering your courses...");

        try {
            const payload = {
                courses: draftEnrolled.map((id) => ({ courseOfferingId: id }))
            };

            const res = await api.post("/student/me/enroll", payload);
            const updatedEnrollment = res.data.enrollment;
            if (updatedEnrollment && updatedEnrollment.courses) {
                const newIds = updatedEnrollment.courses.map(c => c.courseOfferingId);
                setEnrolledCourses(newIds);
                setDraftEnrolled(newIds);
                localStorage.removeItem("courseDraft");
                await swalService.success("Success!", "Your enrollment has been processed successfully.");
            } else {
                await fetchData();
                await swalService.success("Success!", "Enrollment updated.");
            }
        } catch (err) {
            console.error(err);
            swalService.error("Registration Failed", err.response?.data?.message || err.response?.data?.error || "Something went wrong!");
        } finally {
            setSaving(false);
        }
    };

    const getScoreStyle = (score, index) => {
        const baseOpacity = index === 0 ? 0.15 : index < 3 ? 0.08 : 0.05;
        const borderOpacity = Math.max(0.2, score / 20);
        return {
            borderLeft: `5px solid rgba(var(--primary-rgb), ${borderOpacity})`,
            backgroundColor: index === 0 ? `rgba(255, 215, 0, 0.08)` : `rgba(var(--accent-rgb), ${baseOpacity})`,
            transition: 'all 0.3s ease'
        };
    };

    if (loading) return <div className="loading-container"><div className="loader"></div></div>;

    return (
        <div className="management-container student-offerings-container">
            {/* التعديل الجديد للـ Alert: شكل Dark/Glassmorphism */}
            <div className="registration-status-bar">
                {semesterData?.settings?.allowEnrollment ? (
                    <div className="premium-status-alert open">
                        <div className="status-icon-container">
                            <FaClock className="pulse-icon" />
                        </div>
                        <div className="status-content">
                            <span className="label">Enrollment in Progress</span>
                            <span className="timer">{timeLeft} remaining</span>
                        </div>
                    </div>
                ) : (
                    <div className="premium-status-alert closed">
                        <div className="status-icon-container">
                            <AlertTriangle className="pulse-icon" />
                        </div>
                        <div className="status-content">
                            <span className="label">Enrollment Status</span>
                            <span className="timer">
                                {semesterData?.status === "paused" ? "Currently Paused" : "Currently Closed"}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="prereg-header header">
                <h2>Pre-registration Enrollment</h2>
                {isDirty ? (
                    <div className="status-alert warning"><FaExclamationTriangle /> Unsaved Changes</div>
                ) : (
                    <div className="status-alert success"><FaCheckCircle /> Everything is up to date</div>
                )}
            </div>

            <div className={`credit-info-card ${isLimitReached ? "limit-reached" : ""}`}>
                <div className="credit-text">
                    <FaInfoCircle />
                    <span>Credits: <strong>{currentTotalCredits}</strong> / {allowedCredits}</span>
                </div>
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min((currentTotalCredits / allowedCredits) * 100, 100)}%` }}></div>
                </div>
            </div>



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
                                                <span className={`status-badge ${offering.status.toLowerCase()}`}>
                                                    {offering.status}
                                                </span>
                                            </td>
                                            <td>
                                                {isInDraft ? (
                                                    <button className="btn-delete" onClick={() => removeCourse(offering._id)}>
                                                        <X size={22} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        className={`btn-view ${isDisabled || !semesterData?.settings?.allowEnrollment ? "disabled-btn" : ""}`}
                                                        onClick={() => addCourse(offering._id)}
                                                        disabled={isDisabled || !semesterData?.settings?.allowEnrollment}
                                                        title={isDisabled ? "Credit limit reached" : "Add Course"}
                                                    >
                                                        <Plus size={22} />
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
                                <tr><td colSpan="4"><p className="empty-msg">No courses selected</p></td></tr>
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
                    className={`save-btn ${isDirty && semesterData?.settings?.allowEnrollment ? "active" : ""}`}
                    onClick={saveEnrollment}
                    title={!semesterData?.settings?.allowEnrollment ? "Registration is currently unavailable" : ""}
                    disabled={
                        !isDirty ||
                        saving ||
                        !semesterData?.settings?.allowEnrollment ||
                        semesterData?.status === "paused" ||
                        semesterData?.status === "closed"
                    }
                >
                    {saving ? "Saving..." : "Save Enrollment"}
                </button>
            </div>
            {recommendations.length > 0 && (
                <div className={`section recommendations-section animated-border ${!isRecVisible ? "collapsed" : ""}`}>
                    <div
                        className="section-title-with-icon collapsible-header"
                        onClick={() => setIsRecVisible(!isRecVisible)}
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Sparkles className="icon-magic sparkle-animation" />
                            <h3>Personalized Recommendations</h3>
                        </div>
                        {isRecVisible ? <FaChevronUp /> : <FaChevronDown />}
                    </div>

                    {isRecVisible && (
                        <div className="table-wrapper fade-in">
                            <table className="offerings-table recommendation-table">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Code</th>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recommendations.map((rec, index) => {
                                        const offering = rec.course;
                                        const isInDraft = draftEnrolled.includes(offering._id);
                                        const credits = offering.courseId?.courseCredits || 0;
                                        const isDisabled = !isInDraft && (currentTotalCredits + credits > allowedCredits);

                                        return (
                                            <tr
                                                key={offering._id}
                                                className={isInDraft ? "row-selected" : "rec-row"}
                                                style={!isInDraft ? getScoreStyle(rec.score, index) : {}}
                                            >
                                                <td>
                                                    {index === 0 ? (
                                                        <span className="rank-badge gold"><FaTrophy size={14} /> Top Pick</span>
                                                    ) : index === 1 ? (
                                                        <span className="rank-badge silver"><FaAward size={14} /> Highly Rec.</span>
                                                    ) : index === 2 ? (
                                                        <span className="rank-badge bronze"><FaMedal size={14} /> Recommended</span>
                                                    ) : (
                                                        <span className="rank-number">#{index + 1}</span>
                                                    )}
                                                </td>
                                                <td><strong>{offering.courseId?._id}</strong></td>
                                                <td>{offering.courseId?.courseName}</td>
                                                <td>
                                                    <span className="type-badge-minimal">
                                                        {offering.courseId?.courseType}
                                                    </span>
                                                </td>
                                                <td>
                                                    {isInDraft ? (
                                                        <button className="btn-delete" onClick={() => removeCourse(offering._id)}>
                                                            <X size={22} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className={`btn-view ${isDisabled || !semesterData?.settings?.allowEnrollment ? "disabled-btn" : ""}`}
                                                            onClick={() => addCourse(offering._id)}
                                                            disabled={isDisabled || !semesterData?.settings?.allowEnrollment}
                                                            title={isDisabled ? "Credit limit reached" : "Add Course"}
                                                        >
                                                            <Plus size={22} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentCourseOfferingsPage;