import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import swalService from "../../services/swal";
import "../styles/PreRegistrationManagementPage.css";
import { Search, Play, Square, BarChart3, Clock, AlertTriangle } from 'lucide-react';

const PreRegistrationManagementPage = () => {
    const navigate = useNavigate();
    const { role } = useParams();

    // --- States ---
    const [currentSemester, setCurrentSemester] = useState(null);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterLevel, setFilterLevel] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [isPublished, setIsPublished] = useState(false);
    const [allowEnrollment, setAllowEnrollment] = useState(false);
    const [updatingCourseId, setUpdatingCourseId] = useState(null);

    // حل مشكلة المتغيرات غير المعرفة
    const [timeLeft, setTimeLeft] = useState("");
    const semesterData = currentSemester;

    // --- Effects ---
    useEffect(() => {
        fetchCurrentSemester();
    }, []);

    useEffect(() => {
        if (currentSemester) {
            fetchCourses();
        } else {
            setCourses([]);
        }
    }, [currentSemester]);

    // منطق حساب الوقت المتبقي وتحديثه
    useEffect(() => {
        const calculateTime = () => {
            if (!currentSemester?.timeLine?.preRegistration?.end) {
                setTimeLeft("No Time");
                return;
            }

            const end = new Date(currentSemester.timeLine.preRegistration.end);
            const now = new Date();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft("No Time");
            } else {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((diff / 1000 / 60) % 60);
                setTimeLeft(`${days}d ${hours}h ${minutes}m`);
            }
        };

        calculateTime();
        const timer = setInterval(calculateTime, 60000);
        return () => clearInterval(timer);
    }, [currentSemester]);

    // Auto-pause Logic
    useEffect(() => {
        const checkAutoPause = async () => {
            if (allowEnrollment && currentSemester?.timeLine?.preRegistration) {
                const now = new Date();
                const end = new Date(currentSemester.timeLine.preRegistration.end);
                if (now > end) {
                    try {
                        await api.put(`/semesters/${currentSemester._id}/stopPreRegistration`);
                        setAllowEnrollment(false);
                        // تحديث الكائن لضمان تحديث البار تلقائياً
                        setCurrentSemester(prev => ({
                            ...prev,
                            settings: { ...prev.settings, allowEnrollment: false }
                        }));
                        swalService.info("Notice", "Registration period has ended. Portal closed automatically.");
                    } catch (err) {
                        console.error("Auto-pause failed", err);
                    }
                }
            }
        };
        const timer = setInterval(checkAutoPause, 60000);
        return () => clearInterval(timer);
    }, [allowEnrollment, currentSemester]);

    // --- Functions ---
    const fetchCurrentSemester = async () => {
        try {
            const res = await api.get("/semesters");
            const current = res.data.find(s => s.isCurrent);
            if (current) {
                const detailRes = await api.get(`/semesters/${current._id}`);
                setCurrentSemester(detailRes.data);
                setAllowEnrollment(detailRes.data.settings?.allowEnrollment || false);
            }
        } catch (err) {
            console.error("Error fetching current semester:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const coursesRes = await api.get("/courses");
            const allBaseCourses = coursesRes.data;

            let offerings = [];
            if (currentSemester?._id) {
                const offRes = await api.get(`/course-offerings?semesterId=${currentSemester._id}`);
                offerings = offRes.data || [];
            }

            setIsPublished(offerings.length > 0);

            const mergedCourses = allBaseCourses.map(course => {
                const existingOffering = offerings.find(off =>
                    (off.courseId?._id === course._id) || (off.courseId === course._id)
                );
                return {
                    ...course,
                    status: existingOffering ? existingOffering.status : 'proposed',
                    offeringId: existingOffering ? existingOffering._id : null
                };
            });
            setCourses(mergedCourses);
        } catch (err) {
            console.error("Error fetching courses:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleCourseStatus = async (courseId, newStatus) => {
        if (!currentSemester || !isPublished) return;

        if (newStatus === 'closed') {
            const result = await swalService.confirm(
                "Close Course?",
                "Closing this course will prevent new enrollments. Proceed?",
                "Yes, Close it"
            );
            if (!result.isConfirmed) return;
        }

        setUpdatingCourseId(courseId);
        const offeringId = `${courseId}-${currentSemester._id}`;
        try {
            swalService.showLoading("Updating...");
            await api.put(`/course-offerings/${offeringId}`, { status: newStatus });
            setCourses(prev => prev.map(c => c._id === courseId ? { ...c, status: newStatus } : c));
            swalService.success("Updated", `Course is now ${newStatus}`, 1500);
        } catch (err) {
            swalService.error("Update Failed", "Could not change course status.");
        } finally {
            setUpdatingCourseId(null);
        }
    };

    const publishCourses = async () => {
        if (!currentSemester) return;
        const result = await swalService.confirm(
            "Publish Course List?",
            "This will generate the official offerings. Action is irreversible.",
            "Yes, Publish Now!"
        );
        if (!result.isConfirmed) return;

        try {
            swalService.showLoading("Publishing...");
            const preparedCourses = courses.map(c => ({
                courseId: c._id,
                status: c.status
            }));
            await api.post("/course-offerings/list", {
                semesterId: currentSemester._id,
                courses: preparedCourses
            });
            swalService.success("Published!", "Courses are now live.");
            setIsPublished(true);
            fetchCourses();
        } catch (err) {
            swalService.error("Error", "Something went wrong during publishing.");
        }
    };

    const handleStartRegistration = async () => {
        try {
            swalService.showLoading("Opening Portal...");
            await api.put(`/semesters/${currentSemester._id}/startPreRegistration`);
            setAllowEnrollment(true);
            // تحديث كائن السمستر لضمان تحديث البار فوراً
            setCurrentSemester(prev => ({
                ...prev,
                settings: { ...prev.settings, allowEnrollment: true }
            }));
            swalService.success("Portal Opened", "Students can now register.");
        } catch (err) {
            swalService.error("Action Denied", "Check timeline dates.");
        }
    };

    const handleStopRegistration = async () => {
        try {
            await api.put(`/semesters/${currentSemester._id}/stopPreRegistration`);
            setAllowEnrollment(false);
            // تحديث كائن السمستر لضمان تحديث البار فوراً
            setCurrentSemester(prev => ({
                ...prev,
                settings: { ...prev.settings, allowEnrollment: false }
            }));
            swalService.success("Portal Paused", "Registration hidden.");
        } catch (err) {
            swalService.error("Error", "Failed to pause.");
        }
    };

    const isWithinPreRegPeriod = useMemo(() => {
        if (!currentSemester?.timeLine?.preRegistration) return false;
        const now = new Date();
        const start = new Date(currentSemester.timeLine.preRegistration.start);
        const end = new Date(currentSemester.timeLine.preRegistration.end);
        return now >= start && now <= end;
    }, [currentSemester]);

    const filteredCourses = useMemo(() => {
        return courses.filter(course => {
            const matchesSearch = course.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                course._id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLevel = filterLevel === "All" || String(course.courseLevel) === filterLevel;
            const matchesStatus = filterStatus === "All" || course.status === filterStatus;
            return matchesSearch && matchesLevel && matchesStatus;
        });
    }, [courses, searchTerm, filterLevel, filterStatus]);

    if (loading) return <div className="loading">Loading Registration System...</div>;

    return (
        <div className="management-container prereg-container">

            <div className="prereg-header">
                <div>
                    <h2>Pre-Registration Management</h2>
                    {currentSemester ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <p className="semester-label">Semester: <strong>{currentSemester.name}</strong></p>
                            <span className={`status-badge ${isPublished ? 'live' : 'draft'}`}>
                                {isPublished ? "● Courses: Published" : "● Courses: Draft"}
                            </span>
                            {allowEnrollment && <span className="status-badge enrollment-on">● Student Portal: OPEN</span>}
                        </div>

                    ) : (
                        <p className="semester-label error">No Active Semester Found</p>
                    )}
                </div>
                <button className="btn-2" onClick={() => navigate(`/staff/${role}/semester-manage`)}>
                    Go to Semester Management
                </button>
            </div>

            <div className="registration-status-bar" style={{ marginTop: '15px ', marginBottom: '25px ' }}>
                {semesterData?.settings?.allowEnrollment && timeLeft !== "No Time" ? (
                    <div className="premium-status-alert open">
                        <div className="status-icon-container">
                            <Clock className="pulse-icon" />
                        </div>
                        <div className="status-content">
                            <span className="label">Enrollment in Progress</span>
                            <span className="timer">{timeLeft} remaining</span>
                        </div>
                    </div>
                ) : timeLeft === "No Time" ? (
                    <div className="premium-status-alert closed">
                        <div className="status-icon-container">
                            <AlertTriangle className="pulse-icon" />
                        </div>
                        <div className="status-content">
                            <span className="label">Enrollment Status</span>
                            <span className="timer">Registration Period Ended</span>
                        </div>
                    </div>
                ) : (
                    <div className="premium-status-alert closed">
                        <div className="status-icon-container">
                            <AlertTriangle className="pulse-icon" />
                        </div>
                        <div className="status-content">
                            <span className="label">Enrollment Status</span>
                            <span className="timer">Currently Paused</span>
                        </div>
                    </div>
                )}
            </div>

            <div className={`registration-content ${!currentSemester ? 'disabled-overlay' : ''}`}>
                <div className="table-controls">
                    <div className="search-in-prereg">
                        <Search size={22} color="#9ca3af" />
                        <input
                            type="text"
                            placeholder="Search by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <div className="drop-filters" style={{ display: 'flex', gap: '10px' }}>
                        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="filter-select">
                            <option value="All">All Levels</option>
                            <option value="freshman">Freshman</option>
                            <option value="sophomore">Sophomore</option>
                            <option value="junior">Junior</option>
                            <option value="senior-1">senior-1</option>
                            <option value="senior-2">senior-2</option>
                            <option value="senior">Senior</option>
                        </select>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
                            <option value="All">All Statuses</option>
                            <option value="open">Open</option>
                            <option value="proposed">Proposed</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="courses-table">
                        <thead>
                            <tr>
                                <th>Open</th>
                                <th>Locked</th>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Level</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCourses.map(course => (
                                <tr key={course._id} className={`row-status-${course.status}`}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={course.status === 'open'}
                                            onChange={() => toggleCourseStatus(course._id, course.status === 'open' ? 'proposed' : 'open')}
                                            disabled={!isPublished || !currentSemester}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={course.status === 'closed'}
                                            onChange={() => toggleCourseStatus(course._id, course.status === 'closed' ? 'proposed' : 'closed')}
                                            disabled={!isPublished || !currentSemester}
                                        />
                                    </td>
                                    <td>{course._id}</td>
                                    <td>{course.courseName}</td>
                                    <td>{course.courseLevel}</td>
                                    <td>{course.courseType}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="publish-section">
                    {!isPublished ? (
                        <div className="action-card">
                            <p>To set statuses in the table above and generate the official list click publish.</p>
                            <button className="publish-btn" onClick={publishCourses}>
                                Publish Courses List
                            </button>
                        </div>
                    ) : (
                        <div className="action-card success">
                            <div className="enrollment-management-box">
                                <p>Open or pause students' enrollment</p>
                                <div className="enrollment-buttons" style={{ display: 'flex', gap: '10px' }}>
                                    {!allowEnrollment ? (
                                        <button
                                            className="btn-1"
                                            onClick={handleStartRegistration}
                                            disabled={!isWithinPreRegPeriod}
                                            title={!isWithinPreRegPeriod ? "Registration period has ended" : ""}
                                        >
                                            <Play size={18} /> Start Enrollment
                                        </button>
                                    ) : (
                                        <button className="btn-1" onClick={handleStopRegistration}>
                                            <Square size={18} /> Pause Enrollment
                                        </button>
                                    )}

                                    <button
                                        className="btn-2"
                                        onClick={() => navigate(`/staff/${role}/enrollment-stats/${currentSemester._id}`)}
                                    >
                                        <BarChart3 size={18} /> Enrollment Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PreRegistrationManagementPage;