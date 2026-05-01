import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import swalService from "../../services/swal";
import SemesterModal from "../../components/SemesterModal";
import SemesterTimeline from "../../components/SemesterTimeline";
import "../styles/PreRegistrationManagementPage.css";
import { Search, Play, Square, BarChart3, AlertTriangle } from 'lucide-react';

const PreRegistrationManagementPage = () => {
    const navigate = useNavigate();
    const { role } = useParams();
    // --- States ---
    const [currentSemester, setCurrentSemester] = useState(null);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSemesterModal, setShowSemesterModal] = useState(false);
    const [preRegDays, setPreRegDays] = useState(7);

    // UI States
    const [searchTerm, setSearchTerm] = useState("");
    const [filterLevel, setFilterLevel] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [isPublished, setIsPublished] = useState(false);
    const [allowEnrollment, setAllowEnrollment] = useState(false);

    const [updatingCourseId, setUpdatingCourseId] = useState(null);

    // --- Effects ---
    useEffect(() => {
        fetchSemesters();
    }, []);

    useEffect(() => {
        if (currentSemester) {
            fetchCourses();
        } else {
            setCourses([]);
        }
    }, [currentSemester]);


    useEffect(() => {
        const timer = setInterval(() => {
            if (currentSemester) {
                setCurrentSemester(prev => ({ ...prev }));
            }
        }, 60000); // تحديث كل دقيقة

        return () => clearInterval(timer);
    }, [currentSemester]);


    useEffect(() => {
        const checkAutoPause = async () => {
            if (allowEnrollment && currentSemester?.timeLine?.preRegistration) {
                const now = new Date();
                const end = new Date(currentSemester.timeLine.preRegistration.end);

                if (now > end) {
                    try {
                        await api.put(`/semesters/${currentSemester._id}/stopPreRegistration`);
                        setAllowEnrollment(false);
                        swalService.info("Notice", "Registration period has ended. Portal closed automatically.");
                    } catch (err) {
                        console.error("Auto-pause failed", err);
                    }
                }
            }
        };
        checkAutoPause();
    }, [allowEnrollment, currentSemester]);

    // --- Functions ---
    const fetchSemesters = async () => {
        try {
            const res = await api.get("/semesters");
            console.log(res.data)
            const current = res.data.find(s => s.isCurrent);
            if (current) {
                const detailRes = await api.get(`/semesters/${current._id}`);
                setCurrentSemester(detailRes.data);
                setAllowEnrollment(detailRes.data.settings?.allowEnrollment || false);
            } else {
                setCurrentSemester(null);
            }
        } catch (err) {
            console.error("Error fetching semesters:", err);
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
        if (!currentSemester) return;

        if (newStatus === 'closed') {
            const result = await swalService.confirm(
                "Close Course?",
                "Closing this course will prevent new enrollments and may affect student selections. Proceed?",
                "Yes, Close it"
            );
            if (!result.isConfirmed) return;
        }

        if (isPublished) {
            setUpdatingCourseId(courseId);
            const offeringId = `${courseId}-${currentSemester._id}`;
            try {
                swalService.showLoading("Updating...");
                await api.put(`/course-offerings/${offeringId}`, { status: newStatus });

                setCourses(prev => prev.map(c => c._id === courseId ? { ...c, status: newStatus } : c));
                swalService.success("Updated", `Course is now ${newStatus}`, 1500);
            } catch (err) {
                console.error("Update failed", err);
                swalService.error("Update Failed", "Could not change course status.");
            } finally {
                setUpdatingCourseId(null);
            }
        } else {
            setCourses(prev => prev.map(c => c._id === courseId ? { ...c, status: newStatus } : c));
        }
    };

    const publishCourses = async () => {
        if (!currentSemester) return;

        const result = await swalService.confirm(
            "Publish Course List?",
            "This will generate the official offerings for this semester. This action is irreversible.",
            "Yes, Publish Now!"
        );

        if (!result.isConfirmed) return;

        try {
            swalService.showLoading("Publishing courses...");
            const preparedCourses = courses.map(c => ({
                courseId: c._id,
                status: c.status
            }));

            await api.post("/course-offerings/list", {
                semesterId: currentSemester._id,
                durationDays: preRegDays,
                courses: preparedCourses
            });

            swalService.success("Published!", "Courses are now live for management.");
            setIsPublished(true);
            fetchCourses();
        } catch (err) {
            console.error(err);
            if (err.response?.status === 400) {
                swalService.error("Already Live", "This list has already been published.");
            } else {
                swalService.error("Error", "Something went wrong during publishing.");
            }
        }
    };

    const handleStartRegistration = async () => {
        try {
            swalService.showLoading("Opening Student Portal...");
            await api.put(`/semesters/${currentSemester._id}/startPreRegistration`);
            setAllowEnrollment(true);
            swalService.success("Portal Opened", "Students can now register for courses.");
        } catch (err) {
            swalService.error("Action Denied", "Ensure current date is within the timeline.");
        }
    };

    const handleStopRegistration = async () => {
        try {
            await api.put(`/semesters/${currentSemester._id}/stopPreRegistration`);
            setAllowEnrollment(false);
            swalService.success("Portal Paused", "Student registration is now hidden.");
        } catch (err) {
            swalService.error("Error", "Failed to pause enrollment.");
        }
    };

    const handleForceStopSemester = async () => {
        const result = await swalService.confirm(
            "CRITICAL ACTION",
            "This will PERMANENTLY close the current semester. You cannot undo this!",
            "Yes, End Semester",
            "error"
        );

        if (!result.isConfirmed) return;

        try {
            swalService.showLoading("Closing Semester...");
            await api.put(`/semesters/${currentSemester._id}/forceStop`);
            setCurrentSemester(null);
            swalService.success("Semester Ended", "Semester data archived successfully.");
            fetchSemesters();
        } catch (err) {
            swalService.error("Error", "Failed to force stop.");
        }
    };

    // التعديل الثالث: التأكد من دقة الوصول لبيانات preRegistration كما في image_c917b6.png
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

    if (loading) return <div className="loading">Initializing Management System...</div>;

    return (
        <div className=" management-container prereg-container">
            <div className="prereg-header">
                <div>
                    <h2>Pre-Registration Management</h2>
                    {currentSemester && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <p className="semester-label">Semester: <strong>{currentSemester.name}</strong></p>
                            <span className={`status-badge ${isPublished ? 'live' : 'draft'}`}>
                                {isPublished ? "● Courses: Published" : "● Courses: Draft"}
                            </span>
                            {allowEnrollment && <span className="status-badge enrollment-on">● Student Portal: OPEN</span>}
                        </div>
                    )}
                </div>
                {!currentSemester ? (
                    <button className="start-semester-btn" onClick={() => setShowSemesterModal(true)}>
                        Initialize New Semester
                    </button>
                ) : (
                    <button className="close-semester-btn" onClick={handleForceStopSemester}>
                        <AlertTriangle size={16} /> Force Stop Semester
                    </button>
                )}
            </div>

            <SemesterModal
                show={showSemesterModal}
                onClose={() => setShowSemesterModal(false)}
                onSuccess={(sem) => { setCurrentSemester(sem); setShowSemesterModal(false); fetchSemesters(); }}
            />

            {!currentSemester && (
                <div className="empty-semester">
                    <h3>No Active Semester</h3>
                    <p>Start a semester to manage courses and open student registration.</p>
                    <button className="history-btn" onClick={() => navigate("/dashboard/semester-history")}>
                        View Semesters History
                    </button>
                </div>
            )}

            {currentSemester && (
                <>
                    <SemesterTimeline
                        startDate={currentSemester.startDate}
                        endDate={currentSemester.endDate}
                        timeLine={currentSemester.timeLine}
                        semesterId={currentSemester._id}
                        onUpdate={fetchSemesters}
                    />

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

                    <div className="courses-section">
                        <div className="courses-table-wrapper">
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
                                                    disabled={!isPublished}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={course.status === 'closed'}
                                                    onChange={() => toggleCourseStatus(course._id, course.status === 'closed' ? 'proposed' : 'closed')}
                                                    disabled={!isPublished}
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
                </>
            )}
        </div>
    );
};

export default PreRegistrationManagementPage;