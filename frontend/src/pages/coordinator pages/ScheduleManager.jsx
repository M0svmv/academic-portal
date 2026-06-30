import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../../services/api";
import swalService from "../../services/swal";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    Trash2, Settings, X, RefreshCw, Layers, User, Hash, Menu, Download, Megaphone, EyeOff, Search, Eye, Save, Clock, Users, UserPlus, Briefcase, MoreVertical, Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './styles/ScheduleManager.css';

const STUDENTS_LEVELS = ["freshman", "sophomore", "junior", "senior-1", "senior-2", "senior"];



const STUDENTS_REGULATION = ["New", "Last"]

const ScheduleManager = () => {
    const navigate = useNavigate();
    const [offerings, setOfferings] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [levelFilter, setLevelFilter] = useState("All");
    const [regulationFilter, setRegulationFilter] = useState("All");
    const [activeMenu, setActiveMenu] = useState(null);

    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [conflictData, setConflictData] = useState([]);

    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [modalType, setModalType] = useState("");
    const [selectedStaff, setSelectedStaff] = useState("");
    const [lecturers, setLecturers] = useState([]);
    const [tas, setTas] = useState([]);
    const [assigning, setAssigning] = useState(false);
    const [activeOfferingId, setActiveOfferingId] = useState(null);

    const [config, setConfig] = useState({
        startTime: "09:00",
        duration: 45,
        count: 12
    });
    const [tempPeriods, setTempPeriods] = useState([]);

    const daysOfWeek = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
    const role = localStorage.getItem('role') || 'coordinator';

    useEffect(() => {
        fetchData();
        fetchStaff();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/schedule');
            setOfferings(res.data.courseOfferings || []);

            const fetchedPeriods = res.data.schedule[0]?.periodsTime || [];
            setPeriods(fetchedPeriods);
            setTempPeriods(fetchedPeriods);
        } catch (err) {
            console.error("❌ Data fetch error:", err);
            swalService.error("Fetch Error", "Could not load schedule data.");
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const staffRes = await api.get("/staff");
            setLecturers(staffRes.data.filter(s => s.roles.includes("lecturer")));
            setTas(staffRes.data.filter(s => s.roles.includes("ta")));
        } catch (err) {
            console.error("❌ Staff fetch error:", err);
        }
    };

    const previewGeneratedPeriods = () => {
        let currentStart = config.startTime;
        const newPeriods = [];
        for (let i = 0; i < config.count; i++) {
            const [hours, minutes] = currentStart.split(':').map(Number);
            const startDate = new Date();
            startDate.setHours(hours, minutes, 0);
            const endDate = new Date(startDate.getTime() + config.duration * 60000);
            const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
            newPeriods.push({ startTime: currentStart, endTime });
            currentStart = endTime;
        }
        setTempPeriods(newPeriods);
    };

    const handleManualPeriodChange = (index, field, value) => {
        const updated = [...tempPeriods];
        updated[index] = { ...updated[index], [field]: value };
        setTempPeriods(updated);
    };

    const savePeriods = async () => {
        swalService.showLoading("Saving Periods...");
        try {
            await api.post('/schedule/set/time', { periodsTime: tempPeriods });
            await fetchData();
            swalService.success("Success", "Periods updated successfully");
            setIsModalOpen(false);
        } catch (err) {
            swalService.error("Update Failed", "Failed to update periods configuration");
        }
    };

    // --- Assignment Logic ---
    const openStaffModal = (offeringId, type) => {
        setActiveOfferingId(offeringId);
        setModalType(type);
        setSelectedStaff("");
        setIsStaffModalOpen(true);
    };

    const handleAssignInstructor = async () => {
        if (!selectedStaff) return swalService.error("Wait!", "Please select a lecturer");
        setAssigning(true);
        try {
            await api.post(`/course-offerings/${activeOfferingId}/assign-instructor`, { instructorId: selectedStaff });
            swalService.success("Success", "Instructor assigned successfully!");
            setIsStaffModalOpen(false);
            fetchData();
        } catch (err) {
            swalService.error("Failed", "Failed to assign instructor.");
        } finally {
            setAssigning(false);
        }
    };

    const handleAssignTA = async () => {
        if (!selectedStaff) return swalService.error("Wait!", "Please select a TA");
        setAssigning(true);
        try {
            await api.post(`/course-offerings/${activeOfferingId}/assign-ta`, { taId: selectedStaff });
            swalService.success("Success", "TA assigned successfully!");
            setIsStaffModalOpen(false);
            fetchData();
        } catch (err) {
            swalService.error("Failed", "Failed to assign TA.");
        } finally {
            setAssigning(false);
        }
    };

    const toggleLecLength = async (offering) => {
        const currentLen = offering.schedule?.lecLength || 2;
        const newLen = currentLen === 1 ? 2 : 1;
        swalService.showLoading("Changing length...");
        try {
            await api.post(`/schedule/${offering._id}`, {
                days: offering.schedule.days,
                lecLength: newLen,
                lecPeriod: offering.schedule.lecPeriod
            });
            await fetchData();
            swalService.close();
        } catch (err) {
            handleScheduleError(err);
        }
    };

    const onDragEnd = (result) => {
        const { destination, draggableId } = result;
        if (!destination) return;

        if (destination.droppableId === 'delete-area') {
            confirmDeletion(draggableId);
            return;
        }

        if (destination.droppableId.includes('-')) {
            const [day, sessionIdxStr] = destination.droppableId.split('-');
            const sessionIndex = parseInt(sessionIdxStr);
            const actualLecPeriod = (sessionIndex - 1) * 2 + 1;
            handleAssignSchedule(draggableId, day, actualLecPeriod);
        }
    };

    const handleAssignSchedule = async (offeringId, day, period) => {
        const course = offerings.find(o => o._id === offeringId);
        const lecLength = course?.schedule?.lecLength || 2;
        swalService.showLoading("Assigning Course...");
        try {
            await api.post(`/schedule/${offeringId}`, {
                days: [day],
                lecLength: lecLength,
                lecPeriod: period
            });
            await fetchData();
            swalService.success("Assigned", `${course?.courseId?.courseName} has been scheduled.`);
        } catch (err) {
            handleScheduleError(err);
        }
    };

    const handleScheduleError = (err) => {
        const errorData = err.response?.data;
        if (errorData?.conflictCourses) {
            setConflictData(errorData.conflictCourses);
            setIsConflictModalOpen(true);
            swalService.close();
        } else {
            swalService.error("Error", errorData?.message || "Something went wrong");
        }
    };

    const confirmDeletion = async (offeringId) => {
        const result = await swalService.confirm("Remove Schedule?", "This will unassign the course from the current slot.");
        if (result.isConfirmed) {
            handleDeleteSchedule(offeringId);
        }
    };

    const handleDeleteSchedule = async (offeringId) => {
        swalService.showLoading("Removing...");
        try {
            await api.delete(`/schedule/${offeringId}`);
            await fetchData();
            swalService.success("Removed", "Course unassigned successfully");
        } catch (err) {
            swalService.error("Delete Failed", "Could not remove the schedule");
        }
    };

    const handleAnnounceSchedule = async () => {
        const result = await swalService.confirm(
            "Announce Schedule?",
            "This will notify all students and instructors that the schedule is final.",
            "Yes, Announce!"
        );

        if (result.isConfirmed) {
            swalService.showLoading("Announcing...");
            try {
                await api.post('/schedule/announce');
                swalService.success("Announced!", "The schedule has been published successfully.");
            } catch (err) {
                swalService.error("Failed", err.response?.data?.message || "Failed to announce schedule");
            }
        }
    };

    const handleHideSchedule = async () => {
        const result = await swalService.confirm(
            "Hide Schedule?",
            "This will hide the schedule from students and instructors.",
            "Yes, Hide!"
        );

        if (result.isConfirmed) {
            swalService.showLoading("Hiding...");
            try {
                await api.post('/schedule/hideSchedule');
                swalService.success("Hidden!", "The schedule has been hidden successfully.");
            } catch (err) {
                swalService.error("Failed", err.response?.data?.message || "Failed to hide schedule");
            }
        }
    };

    const exportToPDF = async () => {
        const tableElement = document.querySelector('.sc-table-wrapper');
        if (!tableElement) return;

        swalService.showLoading("Generating PDF...");
        try {
            const originalStyle = tableElement.style.cssText;
            tableElement.style.overflow = 'visible';
            tableElement.style.height = 'auto';
            tableElement.style.width = tableElement.scrollWidth + 'px';

            const canvas = await html2canvas(tableElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                scrollY: -window.scrollY
            });

            tableElement.style.cssText = originalStyle;
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const ratio = Math.min((pdfWidth - 20) / imgProps.width, (pdfHeight - 20) / imgProps.height);
            const width = imgProps.width * ratio;
            const height = imgProps.height * ratio;

            pdf.addImage(imgData, 'PNG', (pdfWidth - width) / 2, 10, width, height);
            pdf.save(`Academic_Schedule_${new Date().getFullYear()}.pdf`);
            swalService.close();
        } catch (error) {
            swalService.error("Export Error", "Failed to generate PDF document");
        }
    };

    const renderCourseCard = (offering, isInsideGrid = false) => {
        const isMenuOpen = activeMenu === offering._id;




        return (
            <div
                className={`uniform-card-s ${isInsideGrid ? 'grid-version' : 'sidebar-version'}`}
                title={offering.courseId?.courseName}
                onMouseLeave={() => setActiveMenu(null)}
            >
                {isInsideGrid && (<div className="card-top-badges">
                    <div className="left-badges">
                        {offering.enrolledCount !== undefined && (
                            <div className="enroll-badge" title="Enrolled Students">
                                <Users size={10} /> {offering.enrolledCount}
                            </div>
                        )}
                    </div>

                    <div className="right-actions">
                        {isInsideGrid && (
                            <button className="len-btn" onClick={(e) => {
                                e.stopPropagation();
                                toggleLecLength(offering);
                            }}>
                                <Layers size={10} /> {offering.schedule?.lecLength}P
                            </button>
                        )}

                        <button
                            className="dots-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenu(isMenuOpen ? null : offering._id);
                            }}
                        >
                            <MoreVertical size={14} />
                        </button>

                        {isMenuOpen && (
                            <div className="card-dropdown-menu">
                                <button onClick={() => { openStaffModal(offering._id, "instructor"); setActiveMenu(null); }}>
                                    <UserPlus size={12} /> Assign Instructor
                                </button>
                                <button onClick={() => { openStaffModal(offering._id, "ta"); setActiveMenu(null); }}>
                                    <Briefcase size={12} /> Assign TA
                                </button>
                            </div>
                        )}

                    </div>
                </div>
                )}

                {/* اسم المادة */}
                <div className="course-header-row" style={{
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <p className="course-name-text-s">
                        {(() => {
                            const name = offering.courseId?.courseName || "Unknown";
                            return isInsideGrid && name.length > 22 ? name.slice(0, 22) + "…" : name;
                        })()}
                    </p>
                    {!isInsideGrid && (
                        <div className="compact-actions">
                            <button className="mini-action-btn" onClick={() => openStaffModal(offering._id, "instructor")} title="Assign Instructor">
                                <UserPlus size={14} />
                            </button>
                            <button className="mini-action-btn" onClick={() => openStaffModal(offering._id, "ta")} title="Assign TA">
                                <Briefcase size={14} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="course-details-wrapper">

                    {isInsideGrid && (
                        <div className="aca_det">
                            <div className="detail-item-s">
                                <Hash size={10} />
                                <span>{offering.courseId?._id || "N/A"}</span>
                            </div>
                            <div className="detail-item-s" title={`Instructor: ${offering.instructorId?.staffName || 'None'}`}>
                                <User size={10} />
                                <span className="truncate">{offering.instructorId?.staffName || "No Instructor"}</span>
                            </div>


                            <div className="detail-item-s" title={`TA: ${offering.taId?.staffName || 'None'}`}>
                                <Briefcase size={10} />
                                <span className="truncate">{offering.taId?.staffName || "No TA"}</span>
                            </div>
                        </div>

                    )}


                    {!isInsideGrid && (
                        <div className="course-details-wrapper">
                            <div className="aca_det" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                            }}>
                                <div className="detail-item-s" style={{
                                    width: '50%'
                                }}>
                                    <Hash size={10} />
                                    <span>{offering.courseId?._id || "N/A"}</span>
                                </div>
                                {offering.enrolledCount !== undefined && (
                                    <div className="detail-item-s" title="Enrolled Students" style={{
                                        width: '50%'
                                    }}>
                                        <Users size={12} /> {offering.enrolledCount}
                                    </div>

                                )}
                            </div>
                            <div className="aca_det" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                            }}>
                                <div className="detail-item-s" title={`Instructor: ${offering.instructorId?.staffName || 'None'}`} style={{
                                    width: '50%'
                                }}>
                                    <User size={12} />
                                    <span className="truncate">{offering.instructorId?.staffName || "No Instructor"}</span>
                                </div>
                                <div className="detail-item-s" title={`TA: ${offering.taId?.staffName || 'None'}`} style={{
                                    width: '50%'
                                }}>
                                    <Briefcase size={12} />
                                    <span className="truncate">{offering.taId?.staffName || "No TA"}</span>
                                </div>
                            </div>

                        </div>
                    )}


                </div>
            </div>
        );
    };

    const filteredOfferings = offerings
        .filter(o => !o.schedule?.days?.length)
        .filter(o =>
            o.courseId?.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.courseId?._id?.toLowerCase().includes(searchTerm.toLowerCase())
        );


    if (loading) return (
        <div
            className="management-container"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '80vh',
                flexDirection: 'column',
                gap: '14px'
            }}
        >
            <Loader2
                size={42}
                style={{
                    animation: 'spin 1s linear infinite',
                    color: '#2563eb'
                }}
            />

            <h3>Initializing Schedule Portal...</h3>
        </div>
    );
    const hasStudentConflicts = conflictData.some(
        course => (course.conflictStudents || []).length > 0
    );

    return (
        <div className="management-container schedule-container ">
            {/* Mobile Warning Overlay */}
            <div className="mobile-responsive-warning">
                <div className="warning-content">
                    <div className="warning-icon">
                        <EyeOff size={48} />
                    </div>
                    <h2>Screen Too Small</h2>
                    <p>We apologize, managing academic schedules requires a larger workspace for accurate drag-and-drop functionality.</p>
                    <p className="highlight">Please use a desktop or a tablet with a wider screen (minimum 1024px).</p>
                    <button className="btn-2" onClick={() => navigate(-1)}>Go Back</button>
                </div>
            </div>
            <DragDropContext onDragEnd={onDragEnd}>

                <main className="schedule-main">
                    <header className="management-header">
                        <div className="prereg-header">
                            <h2>Academic Schedule</h2>
                        </div>
                        <div className="header-actions">
                            <button className="btn-2" onClick={handleHideSchedule}>
                                <EyeOff size={18} /> Hide
                            </button>
                            <button className="btn-2" onClick={handleAnnounceSchedule}>
                                <Megaphone size={18} /> Announce
                            </button>

                            <button className="btn-2" onClick={exportToPDF}>
                                <Download size={18} /> Export PDF
                            </button>
                            <button className="btn-1" onClick={() => { setTempPeriods(periods); setIsModalOpen(true); }}>
                                <Settings size={18} /> Manage Periods
                            </button>
                            {!isSidebarOpen && (
                                <button className="btn-1" onClick={() => setIsSidebarOpen(true)}>
                                    <Menu size={18} /> Show Catalog
                                </button>
                            )}
                        </div>
                    </header>
                    <div className="sc-table-wrapper" id="printable-schedule">
                        <table className="schedule-table">

                            <colgroup>
                                <col style={{ width: '90px' }} />
                                {[...Array(6)].map((_, i) => (
                                    <col key={i} style={{ width: 'calc((100% - 90px) / 6)' }} />
                                ))}
                            </colgroup>
                            <thead>

                                <tr>
                                    <th className="sticky-row sticky-col corner-header">Days</th>
                                    {[...Array(6)].map((_, i) => {
                                        const pIdx = i * 2;
                                        const p = periods[pIdx];
                                        return (
                                            <th key={i} className="sticky-row period-header">
                                                <div className="period-label">Session {i + 1}</div>
                                                <div className="time-range">
                                                    {p ? `${p.startTime} - ${periods[pIdx + 1]?.endTime || p.endTime}` : '--:--'}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {daysOfWeek.map(day => (
                                    <tr key={day}>
                                        <td className="day-name sticky-col">{day}</td>
                                        {[...Array(6)].map((_, i) => {
                                            const sessionNum = i + 1;
                                            const currentLecStart = (i * 2) + 1;
                                            return (
                                                <Droppable key={`${day}-${sessionNum}`} droppableId={`${day}-${sessionNum}`}>
                                                    {(provided, snapshot) => {
                                                        const assignedCourses = offerings.filter(o =>
                                                            o.schedule?.days?.includes(day) &&
                                                            Number(o.schedule.lecPeriod) === currentLecStart
                                                        );

                                                        return (
                                                            <td ref={provided.innerRef} {...provided.droppableProps}
                                                                className={`slot ${snapshot.isDraggingOver ? 'drop-hover' : ''}`}>

                                                                <div className="courses-stack" style={{
                                                                    display: 'flex',
                                                                    flexWrap: 'wrap',
                                                                    gap: '8px',
                                                                    justifyContent: 'center'
                                                                }}>
                                                                    {assignedCourses.map((course, idx) => (
                                                                        <Draggable key={course._id} draggableId={course._id} index={idx}>
                                                                            {(provided) => (
                                                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                                                                    {renderCourseCard(course, true)}
                                                                                </div>
                                                                            )}
                                                                        </Draggable>
                                                                    ))}
                                                                </div>
                                                                {provided.placeholder}
                                                            </td>
                                                        );
                                                    }}
                                                </Droppable>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>

                <aside className={`schedule-sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
                    <div className="s_sidebar-header">
                        <div className="head">
                            <div className="header-top">
                                <h3>Catalog</h3>
                                <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="sidebar-search-wrapper">
                                <Search size={14} className="search-icon-inside" />
                                <input
                                    type="text"
                                    className="catalog-search-input"
                                    placeholder="Search by ID or Name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <p className='available-text'>{filteredOfferings.length} courses found</p>
                        </div>
                    </div>

                    <Droppable droppableId="sidebar">
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="course-list" >
                                {filteredOfferings.map((offering, index) => (
                                    <Draggable key={offering._id} draggableId={offering._id} index={index}>
                                        {(provided) => (
                                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                                {renderCourseCard(offering)}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>

                    <Droppable droppableId="delete-area">
                        {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.droppableProps}
                                className={`delete-zone ${snapshot.isDraggingOver ? 'active' : ''}`}>
                                <Trash2 size={20} />
                                <span>Drop to Remove</span>
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </aside>

            </DragDropContext>

            {/* Existing Manage Periods Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content period-modal-wide">
                        <div className="modal-header">
                            <div className="title-with-icon">
                                <h2>Time Slot Configuration</h2>
                            </div>
                            <button className="close-sidebar-btn" onClick={() => setIsModalOpen(false)}><X /></button>
                        </div>

                        <div className="modal-body">
                            <div className="config-top-bar">
                                <div className="input-group-row">
                                    <div className="input-field">
                                        <label>Start From</label>
                                        <input type="time" value={config.startTime} onChange={e => setConfig({ ...config, startTime: e.target.value })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Slot (Min)</label>
                                        <input type="number" value={config.duration} onChange={e => setConfig({ ...config, duration: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Total Slots</label>
                                        <input type="number" value={config.count} onChange={e => setConfig({ ...config, count: parseInt(e.target.value) })} />
                                    </div>
                                    <button className="btn-2" onClick={previewGeneratedPeriods}>
                                        <RefreshCw size={16} /> Auto-Generate
                                    </button>
                                </div>
                            </div>

                            <div className="manual-edit-section">
                                <h3>Manual Adjustments</h3>
                                <div className="periods-grid-scroll">
                                    {tempPeriods.map((p, idx) => (
                                        <div key={idx} className="period-edit-card">
                                            <span className="p-index">#{idx + 1}</span>
                                            <div className="p-inputs">
                                                <input
                                                    type="time"
                                                    value={p.startTime}
                                                    onChange={(e) => handleManualPeriodChange(idx, 'startTime', e.target.value)}
                                                />
                                                <span className="p-arrow">→</span>
                                                <input
                                                    type="time"
                                                    value={p.endTime}
                                                    onChange={(e) => handleManualPeriodChange(idx, 'endTime', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className="btn-1" onClick={savePeriods}>
                                <Save size={18} /> Save All Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Assignment Modal */}
            {isStaffModalOpen && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center',
                    alignItems: 'center', zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: '#fff', borderRadius: '12px', width: '450px',
                        padding: '0', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div className="modal-header" style={{
                            padding: '20px', borderBottom: '1px solid #eee', display: 'flex',
                            justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb'
                        }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>
                                {modalType === "instructor" ? "Assign Instructor" : "Assign TA"}
                            </h2>
                            <button onClick={() => setIsStaffModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#667085' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ padding: '25px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                                Select {modalType === "instructor" ? "Lecturer" : "Teaching Assistant"}:
                            </label>
                            <select
                                value={selectedStaff}
                                onChange={(e) => setSelectedStaff(e.target.value)}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px',
                                    border: '1px solid #d1d5db', outline: 'none', fontSize: '1rem',
                                    color: '#000'
                                }}
                            >
                                <option value="">-- Choose {modalType === "instructor" ? "a Lecturer" : "a TA"} --</option>
                                {(modalType === "instructor" ? lecturers : tas).map(staff => (
                                    <option key={staff._id} value={staff._id}>
                                        {staff.staffName} ({staff._id})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="modal-footer" style={{
                            padding: '15px 25px', backgroundColor: '#f9fafb', borderTop: '1px solid #eee',
                            display: 'flex', justifyContent: 'flex-end', gap: '10px'
                        }}>
                            <button className="btn-cancel" onClick={() => setIsStaffModalOpen(false)}>Cancel</button>
                            <button
                                className="btn-1"
                                disabled={assigning}
                                onClick={modalType === "instructor" ? handleAssignInstructor : handleAssignTA}
                            >
                                {assigning ? "Assigning..." : "Confirm Assignment"}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Conflict Details Modal */}
            {isConflictModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content conflict-modal-wide">
                        <div className="modal-header" >
                            <div className="title-with-icon" >
                                <X size={24} color='white' />
                                <h2>Schedule Conflict Detected</h2>
                            </div>
                            <button className="close-sidebar-btn" onClick={() => setIsConflictModalOpen(false)}>
                                <X />
                            </button>
                        </div>

                        <div className="modal-body">
                            <p style={{ marginBottom: '20px', color: '#666' }}>
                                The following courses have overlapping schedules for some students:
                            </p>

                            {/* Filters Section */}
                            {hasStudentConflicts && (
                                <div
                                    className="filters-row"
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-around',
                                    }}
                                >
                                    <div
                                        className="filter-part"
                                        style={{
                                            display: 'flex',
                                            gap: '10px',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <label
                                            style={{
                                                display: 'block',
                                                marginBottom: '5px',
                                                fontWeight: 'bold',
                                                fontSize: '14px'
                                            }}
                                        >
                                            Student Level:
                                        </label>

                                        <select
                                            className="filter-select"
                                            value={levelFilter}
                                            onChange={(e) => setLevelFilter(e.target.value)}
                                            style={{
                                                padding: '8px',
                                                borderRadius: '5px',
                                                border: '1px solid #ccc',
                                                minWidth: '150px'
                                            }}
                                        >
                                            <option value="All">All Levels</option>

                                            {STUDENTS_LEVELS.map(lvl => (
                                                <option key={lvl} value={lvl}>
                                                    {lvl.toUpperCase()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div
                                        className="filter-part"
                                        style={{
                                            display: 'flex',
                                            gap: '10px',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <label
                                            style={{
                                                display: 'block',
                                                marginBottom: '5px',
                                                fontWeight: 'bold',
                                                fontSize: '14px'
                                            }}
                                        >
                                            Regulation:
                                        </label>

                                        <select
                                            className="filter-select"
                                            value={regulationFilter}
                                            onChange={(e) => setRegulationFilter(e.target.value)}
                                            style={{
                                                padding: '8px',
                                                borderRadius: '5px',
                                                border: '1px solid #ccc',
                                                minWidth: '150px'
                                            }}
                                        >
                                            <option value="All">All Regulations</option>

                                            {STUDENTS_REGULATION.map(reg => (
                                                <option key={reg} value={reg}>
                                                    {reg}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {conflictData.map((course, cIdx) => {

                                // ==============================
                                // Doctor Conflict Card
                                // ==============================
                                if (course.type === "doctor-conflict") {
                                    return (
                                        <div
                                            key={cIdx}
                                            className="conflict-course-section"
                                            style={{ marginBottom: '25px' }}
                                        >
                                            <div
                                                className="conflict-course-header"
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    background: '#fff4e5',
                                                    padding: '14px 16px',
                                                    borderRadius: '10px',
                                                    borderLeft: '5px solid #ff9800'
                                                }}
                                            >
                                                <div>
                                                    <h4 style={{ margin: 0, color: '#e65100' }}>
                                                        Instructor Conflict
                                                    </h4>

                                                    <p style={{
                                                        margin: '6px 0 0',
                                                        color: '#555',
                                                        fontSize: '14px'
                                                    }}>
                                                        {course.message}
                                                    </p>
                                                </div>

                                                <div
                                                    style={{
                                                        background: '#ff9800',
                                                        color: '#fff',
                                                        padding: '5px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '13px',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    Doctor Busy
                                                </div>
                                            </div>

                                            <div
                                                style={{
                                                    marginTop: '10px',
                                                    padding: '14px',
                                                    background: '#fff',
                                                    border: '1px solid #eee',
                                                    borderRadius: '10px'
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '20px',
                                                    flexWrap: 'wrap'
                                                }}>
                                                    <div>
                                                        <strong>Course:</strong> {course.courseName}
                                                    </div>

                                                    <div>
                                                        <strong>Instructor:</strong> {course.instructor}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                // ==============================
                                // Students Conflict Card
                                // ==============================
                                const filteredStudents = (course.conflictStudents || []).filter(student => {
                                    const matchesLevel =
                                        levelFilter === "All" || student.level === levelFilter;

                                    const matchesReg =
                                        regulationFilter === "All" || student.regulation === regulationFilter;

                                    return matchesLevel && matchesReg;
                                });

                                if (filteredStudents.length === 0) return null;

                                return (
                                    <div key={cIdx} className="conflict-course-section" style={{ marginBottom: '30px' }}>

                                        <div className="conflict-course-header" style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            background: '#fff5f5',
                                            padding: '10px 15px',
                                            borderRadius: '8px',
                                            borderLeft: '4px solid #f94545'
                                        }}>
                                            <h4 style={{ margin: 0, color: '#d90429' }}>
                                                {course.courseName}
                                            </h4>

                                            <span
                                                className="conflict-count-badge"
                                                style={{
                                                    background: '#f94545',
                                                    color: 'white',
                                                    padding: '2px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.85em'
                                                }}
                                            >
                                                {filteredStudents.length} Students Affected
                                            </span>
                                        </div>

                                        <div
                                            className="table-wrapper"
                                            style={{ marginTop: '10px', overflowX: 'auto' }}
                                        >
                                            <table className="management-table compact">
                                                <thead>
                                                    <tr>
                                                        <th>Student ID</th>
                                                        <th>Student Name</th>
                                                        <th>Level</th>
                                                        <th>Regulation</th>
                                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {filteredStudents.map((student, sIdx) => (
                                                        <tr key={sIdx}>
                                                            <td style={{
                                                                fontFamily: 'monospace',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                {student.studentId.id}
                                                            </td>

                                                            <td>{student.studentId.studentName}</td>

                                                            <td style={{ textTransform: 'capitalize' }}>
                                                                {student.level}
                                                            </td>

                                                            <td>{student.regulation}</td>

                                                            <td style={{ textAlign: 'center' }}>
                                                                <button
                                                                    className="btn-view"
                                                                    onClick={() =>
                                                                        navigate(`/staff/${role}/students/${student.studentId._id}`)
                                                                    }
                                                                    title="View Profile"
                                                                >
                                                                    <Eye size={18} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="btn-2" onClick={() => setIsConflictModalOpen(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleManager;