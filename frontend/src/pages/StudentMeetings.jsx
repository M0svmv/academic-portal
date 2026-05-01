import React, { useState, useEffect } from "react";
import api from "../services/api";
import swalService from "../services/swal";
import {
    Calendar, Clock, Plus, Loader2,
    Info, X, CheckCircle, CalendarClock,
    ChevronLeft, ChevronRight, ListTodo, History
} from 'lucide-react';
import "./styles/AdvisingManagement.css";
import "./styles/Meetings.css";
import "./academicAdvisor/styles/Ad-meet.css"


const StudentMeetings = () => {
    // Calendar & Filtering States
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [activeTab, setActiveTab] = useState('Upcoming Meetings');
    const [highlightedMeetingId, setHighlightedMeetingId] = useState(null);

    // Data States
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        meetingDate: "",
        meetingTime: "",
        meetingNotes: ""
    });

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        setLoading(true);
        try {
            const res = await api.get("/student/me/meetings");
            setMeetings(res.data || []);
        } catch (err) {
            swalService.error("Error", "Failed to load your meetings.");
        } finally {
            setLoading(false);
        }
    };

    // Calendar Helper Functions
    const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

    const changeMonth = (offset) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
    };

    // Filtering Logic
    const getDisplayData = () => {
        let filtered = meetings;

        // 1. Filter by Tab
        if (activeTab === 'Meeting Requests') {
            filtered = filtered.filter(m => m.meetingStatus === 'pending');
        } else if (activeTab === 'Upcoming Meetings') {
            filtered = filtered.filter(m => m.meetingStatus === 'approved');
        } else if (activeTab === 'History') {
            filtered = filtered.filter(m => m.meetingStatus === 'declined');
        }

        // 2. Filter by Selected Date
        if (selectedDate) {
            filtered = filtered.filter(m =>
                m.meetingDate && m.meetingDate.startsWith(selectedDate)
            );
        }

        // 3. Specific Meeting Highlight
        if (highlightedMeetingId) {
            filtered = filtered.filter(m => m._id === highlightedMeetingId);
        }

        return filtered;
    };

    const displayData = getDisplayData();

    const stats = {
        requests: meetings.filter(m => m.meetingStatus === 'pending').length,
        upcoming: meetings.filter(m => m.meetingStatus === 'approved').length,
        history: meetings.filter(m => m.meetingStatus === 'declined').length
    };

    const handleRequestMeeting = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post("/student/me/request-meeting", formData);
            await swalService.success("Sent!", "Your meeting request has been submitted.");
            setIsModalOpen(false);
            setFormData({ meetingDate: "", meetingTime: "", meetingNotes: "" });
            fetchMeetings();
        } catch (err) {
            swalService.error("Failed", err.response?.data?.message || "Could not send request.");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending': return <span className="badge-status pending">Pending</span>;
            case 'approved': return <span className="badge-status success">Approved</span>;
            case 'declined': return <span className="badge-status danger">Declined</span>;
            default: return <span className="badge-status gray">{status}</span>;
        }
    };

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const totalDays = daysInMonth(month, year);
        const startDay = firstDayOfMonth(month, year);
        const days = [];

        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayMeetings = meetings.filter(m =>
                m.meetingDate && m.meetingDate.startsWith(dateStr) && m.meetingStatus === 'approved'
            );

            const hasMeeting = dayMeetings.length > 0;
            const isSelected = selectedDate === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            days.push(
                <div
                    key={d}
                    className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected-day' : ''} ${hasMeeting ? 'has-event' : ''}`}
                    onClick={() => {
                        setSelectedDate(isSelected ? null : dateStr);
                        setHighlightedMeetingId(null);
                    }}
                >
                    <span className="day-number">{d}</span>
                    <div className="calendar-events-list">
                        {dayMeetings.slice(0, 2).map(m => (
                            <div
                                key={m._id}
                                className={`calendar-event-label student-event ${highlightedMeetingId === m._id ? 'active-event' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate(dateStr);
                                    setHighlightedMeetingId(m._id);
                                    setActiveTab('Upcoming Meetings');
                                }}
                            >
                                <span className="event-time">{m.meetingTime}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return days;
    };

    return (
        <div className="management-container advising-container advising-meet">
            <header className="meeting-header">
                <div className="management-header meeting-header">
                    <div className="prereg-header">
                        <h2>My Advising Calendar</h2>
                    </div>
                    <button className="btn-1" onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> Request New Meeting
                    </button>
                </div>
            </header>

            {/* Insights / Tabs Navigation */}
            <div className="m_insights-grid">
                <div
                    className={`m_insight-card clickable ${activeTab === 'Meeting Requests' ? 'active-tab pending-border' : ''}`}
                    onClick={() => { setActiveTab('Meeting Requests'); setSelectedDate(null); }}
                >
                    <div className="m_insight-icon pending"><ListTodo size={20} /></div>
                    <div className="m_insight-info">
                        <span className="m_insight-label">Pending Requests</span>
                        <h3 className="m_insight-value">{stats.requests}</h3>
                    </div>
                </div>

                <div
                    className={`m_insight-card clickable ${activeTab === 'Upcoming Meetings' ? 'active-tab approved-border' : ''}`}
                    onClick={() => { setActiveTab('Upcoming Meetings'); setSelectedDate(null); }}
                >
                    <div className="m_insight-icon approved"><Calendar size={20} /></div>
                    <div className="m_insight-info">
                        <span className="m_insight-label">Upcoming</span>
                        <h3 className="m_insight-value text-success">{stats.upcoming}</h3>
                    </div>
                </div>

                <div
                    className={`m_insight-card clickable ${activeTab === 'History' ? 'active-tab declined-border' : ''}`}
                    onClick={() => { setActiveTab('History'); setSelectedDate(null); }}
                >
                    <div className="m_insight-icon total"><History size={20} /></div>
                    <div className="m_insight-info">
                        <span className="m_insight-label">History / Declined</span>
                        <h3 className="m_insight-value text-muted">{stats.history}</h3>
                    </div>
                </div>
            </div>

            {/* Calendar Section */}
            <div className="calendar-section-wrapper" style={{ marginBottom: '30px' }}>
                <div className="calendar-card">
                    <div className="calendar-header">
                        <h2>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                        <div className="calendar-controls">
                            <button className="btn-icon" onClick={() => changeMonth(-1)}><ChevronLeft size={20} /></button>
                            <button className="btn-today" onClick={() => setCurrentMonth(new Date())}>Today</button>
                            <button className="btn-icon" onClick={() => changeMonth(1)}><ChevronRight size={20} /></button>
                        </div>
                    </div>
                    <div className="calendar-grid-header">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="weekday-label">{d}</div>)}
                    </div>
                    <div className="calendar-grid">{renderCalendar()}</div>
                </div>
            </div>

            {/* Content Table */}
            <div className="advising-content">
                <div className="maiin_table_contebt">
                    <div className="management-header meeting-header">
                        <div className="prereg-header">
                            <h2>{activeTab}</h2>
                        </div>
                    </div>

                    {(selectedDate || highlightedMeetingId) && (
                        <div className="filter-info-bar">
                            <span>Showing results for: <strong>{selectedDate || "Selected Meeting"}</strong></span>
                            <button onClick={() => { setSelectedDate(null); setHighlightedMeetingId(null); }}>Reset Filters</button>
                        </div>
                    )}

                    <div className="table-wrapper">
                        {loading ? (
                            <div className="loading-state"><Loader2 className="animate-spin" /><p>Loading...</p></div>
                        ) : (
                            <table className="advising-table">
                                <thead>
                                    <tr>
                                        <th>Date & Time</th>
                                        <th>Notes</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayData.length > 0 ? displayData.map(meeting => (
                                        <tr key={meeting._id} className={highlightedMeetingId === meeting._id ? "highlighted-row" : ""}>
                                            <td>
                                                <div className="date-time-cell">
                                                    <div className="cell-with-icon">
                                                        <Calendar size={13} className="cell-icon" />
                                                        {new Date(meeting.meetingDate).toLocaleDateString()}
                                                    </div>
                                                    <div className="cell-with-icon subtitle-text">
                                                        <Clock size={13} className="cell-icon" />
                                                        {meeting.meetingTime}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="notes-cell">{meeting.meetingNotes || "No notes"}</td>
                                            <td>{getStatusBadge(meeting.meetingStatus)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="3" className="empty-table-msg">
                                                <Info size={40} />
                                                <p>No {activeTab} found for this selection.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Request Modal (بقي كما هو في الكود الأصلي الخاص بك) */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Request a Meeting</h3>
                            <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleRequestMeeting}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Meeting Date</label>
                                    <input
                                        type="date"
                                        className="modal-select"
                                        required
                                        min={new Date().toISOString().split("T")[0]}
                                        value={formData.meetingDate}
                                        onChange={(e) => setFormData({ ...formData, meetingDate: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Meeting Time</label>
                                    <input
                                        type="time"
                                        className="modal-select"
                                        required
                                        value={formData.meetingTime}
                                        onChange={(e) => setFormData({ ...formData, meetingTime: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Notes / Reason</label>
                                    <textarea
                                        className="modal-select"
                                        rows="3"
                                        placeholder="What do you want to discuss?"
                                        value={formData.meetingNotes}
                                        onChange={(e) => setFormData({ ...formData, meetingNotes: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : "Submit Request"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentMeetings;