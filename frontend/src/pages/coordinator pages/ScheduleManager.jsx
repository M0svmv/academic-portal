import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../../services/api";
import swalService from "../../services/swal";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    Trash2, Settings, X, RefreshCw, Layers, User, Hash, Menu, Download, Megaphone, Search, Eye, Save, Clock, Users
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './styles/ScheduleManager.css';

const ScheduleManager = () => {
    const navigate = useNavigate();
    const [offerings, setOfferings] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Configuration for bulk generation
    const [config, setConfig] = useState({
        startTime: "09:00",
        duration: 45,
        count: 12
    });

    // Temporary state for manual editing in modal
    const [tempPeriods, setTempPeriods] = useState([]);

    const daysOfWeek = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
    const role = localStorage.getItem('role') || 'coordinator';

    useEffect(() => {
        fetchData();
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
            window.viewStudent = (id) => navigate(`/staff/${role}/students/${id}`);

            const conflictRows = errorData.conflictCourses.map(c =>
                c.conflictStudents.map(s => `
                <tr style="border-bottom: 1px solid #333;">
                    <td style="padding: 10px; color: #f94545;">${c.courseName}</td>
                    <td style="padding: 10px; font-family: monospace;">${s.studentId.id}</td>
                    <td style="padding: 10px;">${s.studentId.studentName}</td>
                    <td style="padding: 10px; text-align: center;">
                        <button onclick="viewStudent('${s.studentId._id}')" 
                                style="background: none; border: none; cursor: pointer; color: #3a86ff;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                    </td>
                </tr>`).join('')
            ).join('');

            const tableHtml = `
                <div style="max-height: 400px; overflow-y: auto; background: #1a1a1a; border-radius: 8px; margin-top: 15px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
                        <thead>
                            <tr style="background: #2d2d2d; position: sticky; top: 0;">
                                <th style="padding: 12px; text-align: left;">Conflict With</th>
                                <th style="padding: 12px; text-align: left;">ID</th>
                                <th style="padding: 12px; text-align: left;">Student</th>
                                <th style="padding: 12px;">View</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${conflictRows}
                        </tbody>
                    </table>
                </div>
            `;
            swalService.error("Schedule Conflict", tableHtml);
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

    const renderCourseCard = (offering, isInsideGrid = false) => (
        <div className={`uniform-card-s ${isInsideGrid ? 'grid-version' : ''}`} title={offering.courseId?.courseName}>
            {isInsideGrid && (
                <div className="card-top-badges">
                    <button className="len-btn" onClick={(e) => {
                        e.stopPropagation();
                        toggleLecLength(offering);
                    }}>
                        <Layers size={10} /> {offering.schedule?.lecLength}P
                    </button>
                    {offering.enrolledCount !== undefined && (
                        <div className="enroll-badge" title="Enrolled Students">
                            <Users size={10} /> {offering.enrolledCount}
                        </div>
                    )}
                </div>
            )}
            <div className="course-header-row">
                <p className="course-name-text-s">
                    {offering.courseId?.courseName || "Unknown"}
                </p>
            </div>
            <div className="course-details-wrapper">
                <div className="detail-item-s">
                    <Hash size={12} />
                    <span>{offering.courseId?._id || "N/A"}</span>
                </div>
                <div className="detail-item-s">
                    <User size={12} />
                    <span>{offering.instructorId?.staffName || "No Instructor"}</span>
                </div>
                {!isInsideGrid && offering.enrolledCount !== undefined && (
                    <div className="detail-item-s enrollment-info">
                        <Users size={12} />
                        <span>{offering.enrolledCount} Students</span>
                    </div>
                )}
            </div>
        </div>
    );

    // Sidebar search filter
    const filteredOfferings = offerings
        .filter(o => !o.schedule?.days?.length)
        .filter(o =>
            o.courseId?.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.courseId?._id?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    if (loading) return <div className="management-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>Initializing Schedule Portal...</div>;

    return (
        <div className="management-container schedule-container ">
            <DragDropContext onDragEnd={onDragEnd}>

                <main className="schedule-main">
                    <header className="management-header">
                        <div className="prereg-header">
                            <h2>Academic Schedule</h2>
                        </div>
                        <div className="header-actions">
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
                                                                <div className="courses-stack">
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
                            <div ref={provided.innerRef} {...provided.droppableProps} className="course-list">
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
        </div>
    );
};

export default ScheduleManager;