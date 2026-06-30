import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import swalService from "../../services/swal";
import {
    FaPlus,
    FaExclamationTriangle,
    FaCheckCircle,
    FaInfoCircle,
    FaArrowLeft,
    FaClock
} from "react-icons/fa";
import { Trash2, X, Loader2, AlertTriangle, Plus } from 'lucide-react';
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
    const [studentRegulation, setStudentRegulation] = useState("last");
    const [semesterData, setSemesterData] = useState(null);
    const [timeLeft, setTimeLeft] = useState("");
    const [regType, setRegType] = useState("");
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);

    const STORAGE_KEY = `draft_coo_${studentId}`;

    const levels = useMemo(() => {
        const allLevels = ["Freshman", "Sophomore", "Junior", "senior-1", "senior-2", "Senior"];
        if (studentRegulation?.toLowerCase() === "new") {
            return allLevels.filter(l => l !== "senior-1" && l !== "senior-2");
        } else {
            return allLevels.filter(l => l !== "Senior");
        }
    }, [studentRegulation]);

    useEffect(() => {
        fetchData();
    }, [studentId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const detailsRes = await api.get(`/students/${studentId}/details`);

            const sData = detailsRes.data;


            setStudentRegulation(sData?.transcript?.regulation || "last");
            setSemesterData(sData?.semester);

            const availableRes = await api.get(`/enrollments/${studentId}/available-courses`);
            setAvailableCourses(availableRes.data?.data?.availableOfferings || availableRes.data.availableOfferings || []);
            setAllowedCredits(availableRes?.data?.allowedCredits || 0);


            // 3. Fetch Currently Enrolled Courses
            const enrolledRes = await api.get(`/enrollments/student/${studentId}`);
            const enrolledData = enrolledRes.data?.courses || [];

            const currentIds = enrolledData.map((item) => {
                if (item.courseOfferingId && typeof item.courseOfferingId === 'object') {
                    return item.courseOfferingId._id;
                }
                return item.courseOfferingId;
            }).filter(id => !!id);

            setOriginalEnrolled(currentIds);

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
        if (!semesterData?.timeLine) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const preReg = semesterData.timeLine.preRegistration;
            const addDrop = semesterData.timeLine.addDrop;

            const preStart = new Date(preReg?.start).getTime();
            const preEnd = new Date(preReg?.end).getTime();
            const adStart = new Date(addDrop?.start).getTime();
            const adEnd = new Date(addDrop?.end).getTime();

            let targetTime = 0;
            let type = "";

            if (now >= preStart && now < preEnd) {
                targetTime = preEnd;
                type = "Pre-Registration";
                setIsRegistrationOpen(true);
            } else if (now >= adStart && now < adEnd) {
                targetTime = adEnd;
                type = "Add & Drop";
                setIsRegistrationOpen(true);
            } else if (now < preStart) {
                targetTime = preStart;
                type = "Registration Starts In";
                setIsRegistrationOpen(false);
            } else {
                setTimeLeft("No Time");
                setRegType("Ended");
                setIsRegistrationOpen(false);
                clearInterval(interval);
                return;
            }

            const distance = targetTime - now;
            setRegType(type);

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [semesterData]);

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
        if (!isRegistrationOpen) return;
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
        if (!isRegistrationOpen) return;
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
            const payload = {
                courses: draftEnrolled.map((id) => ({ courseOfferingId: id }))
            };
            await api.post(`/enrollments/enroll/${studentId}`, payload);
            setOriginalEnrolled([...draftEnrolled]);
            localStorage.removeItem(STORAGE_KEY);
            swalService.success("Success", "Enrollment updated successfully.");
        } catch (err) {
            swalService.error("Failed", err.response?.data?.message || "Update failed!");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="management-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: '14px' }}>
            <Loader2 size={42} style={{ animation: 'spin 1s linear infinite', color: '#2563eb' }} />
            <h3>Loading Student Data...</h3>
        </div>
    );

    return (
        <div className="management-container student-offerings-container">

            <div className="prereg-header header">
                <div className="header-left">
                    <button className="back-btn-round" onClick={() => navigate(-1)}><FaArrowLeft /></button>
                    <div className="title-info">
                        <h2>Enroll Student: #{studentId}</h2>
                    </div>
                </div>
                <div>
                    {isDirty ? (
                        <div className="status-alert warning"><FaExclamationTriangle /> Unsaved Changes</div>
                    ) : (
                        <div className="status-alert success"><FaCheckCircle /> Everything is up to date</div>
                    )}
                </div>
            </div>

            <div className="registration-status-bar">
                {regType !== "Ended" ? (
                    <div className={`premium-status-alert ${isRegistrationOpen ? "open" : "closed"}`}>
                        <div className="status-icon-container">
                            <FaClock className="pulse-icon" />
                        </div>
                        <div className="status-content">
                            <span className="label">{regType} {isRegistrationOpen ? "in Progress" : ""}</span>
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
                            <span className="timer">Registration Period Ended</span>
                        </div>
                    </div>
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
                                                    <button
                                                        className="btn-delete"
                                                        onClick={() => removeCourse(offering._id)}
                                                        disabled={!isRegistrationOpen}
                                                    >
                                                        <X size={22} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn-view"
                                                        onClick={() => addCourse(offering._id)}
                                                        disabled={isDisabled || !isRegistrationOpen}
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
                                                <button
                                                    className="remove-btn"
                                                    onClick={() => removeCourse(id)}
                                                    disabled={!isRegistrationOpen}
                                                >
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
                    disabled={!isDirty || saving || !isRegistrationOpen}
                >
                    {saving ? "Processing..." : "Confirm & Save Enrollment"}
                </button>
            </div>
        </div>
    );
};

export default CooEnrollmentPage;