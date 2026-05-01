import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import swalService from "../../services/swal";
import {
    ArrowLeft, Users, Search, Lock, Unlock,
    GraduationCap, BookOpen, AlertCircle, CheckCircle2, FileText, UserSquare2
} from "lucide-react";

import { FaArrowLeft } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// تأكدي أن المسار لملف الـ CSS صحيح
import "../styles/EnrollmentStatusPage.css";

const EnrollmentStatsPage = () => {
    const { semesterId } = useParams();
    const navigate = useNavigate();
    const { role } = useParams();
    const [offerings, setOfferings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [typeFilter, setTypeFilter] = useState("All");

    // تم تعديل الدالة لتمرير Instructor ID و TA ID
    const handleViewStudents = (courseId, offeringId, courseName, instructorId, taId) => {
        navigate(`/staff/${role}/semester/${semesterId}/course/${courseId}/${offeringId}/students`, {
            state: {
                courseName,
                instructorId,
                taId
            }
        });
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/course-offerings?semesterId=${semesterId}`);
            console.log(res.data)
            setOfferings(res.data || []);
        } catch (err) {
            console.error("Failed to fetch stats", err);
            swalService.error("Connection Error", "Could not load enrollment data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (semesterId) fetchData();
    }, [semesterId]);

    const handleToggleStatus = async (offeringId, currentStatus) => {
        const offering = offerings.find(o => o._id === offeringId);
        const enrolledCount = offering?.enrolledCount || 0;
        const newStatus = currentStatus === "open" ? "closed" : "open";

        if (newStatus === "closed") {
            let title = "Close Course?";
            let text = "Are you sure you want to CLOSE this course? This will prevent any future enrollments.";
            let icon = "warning";

            if (enrolledCount > 0) {
                title = "CRITICAL WARNING";
                text = `This course has (${enrolledCount}) students enrolled. Closing it will PERMANENTLY block their registration!`;
            }

            const result = await swalService.confirm(title, text, "Yes, close it!");
            if (!result.isConfirmed) return;
        }

        try {
            swalService.showLoading("Updating course status...");
            await api.put(`/course-offerings/${offeringId}/status`, { status: newStatus });

            setOfferings(prev => prev.map(off =>
                off._id === offeringId ? { ...off, status: newStatus } : off
            ));

            swalService.success(
                "Status Updated",
                `Course is now ${newStatus.toUpperCase()}`
            );
        } catch (err) {
            console.error("Failed to update status", err);
            swalService.error("Server Error", "Failed to update course status. Please try again.");
        }
    };

    const handleCardClick = (filterName) => {
        if (typeFilter === filterName) {
            setTypeFilter("All");
        } else {
            setTypeFilter(filterName);
        }
    };

    // --- Logic & Calculations ---
    const stats = useMemo(() => {
        const total = offerings.length;
        const empty = offerings.filter(o => (o.enrolledCount || 0) === 0).length;
        const withGrads = offerings.filter(o => (o.graduatingCount || 0) > 0).length;
        const suggestions = offerings.filter(o => o.status === 'open' && (o.enrolledCount || 0) < 5 && (o.graduatingCount || 0) === 0).length;

        return { total, empty, withGrads, suggestions };
    }, [offerings]);

    const filteredData = useMemo(() => {
        return offerings.filter(off => {
            const courseName = off.courseId?.courseName || "";
            const courseCode = off.courseId?._id || "";
            const currentSearch = searchTerm?.toLowerCase() || "";

            const matchesSearch = courseName.toLowerCase().includes(currentSearch) ||
                courseCode.toLowerCase().includes(currentSearch);

            const matchesStatus = statusFilter === "All" || off.status === statusFilter;

            let matchesType = true;
            if (typeFilter === "Graduates") matchesType = (off.graduatingCount || 0) > 0;
            if (typeFilter === "Empty") matchesType = (off.enrolledCount || 0) === 0;
            if (typeFilter === "Suggestions") {
                matchesType = off.status === 'open' && (off.enrolledCount || 0) < 5 && (off.graduatingCount || 0) === 0;
            }

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [offerings, searchTerm, statusFilter, typeFilter]);

    // --- Export PDF Logic ---
    const exportToPDF = () => {
        const doc = new jsPDF();
        const tableColumn = ["Course Details", "Staff (Inst/TA)", "Status", "Students", "Graduating", "Hint"];
        const tableRows = filteredData.map(off => [
            `${off.courseId?.courseName || 'N/A'}\n(${off.courseId?._id || 'N/A'})`,
            `Inst: ${off.instructorId || '-'}\nTA: ${off.taId || '-'}`,
            (off.status || 'N/A').toUpperCase(),
            off.enrolledCount || 0,
            off.graduatingCount || 0,
            (off.enrolledCount || 0) < 5 && off.status === 'open' && (off.graduatingCount || 0) === 0 ? "Low Demand" :
                (off.graduatingCount || 0) > 0 ? "Mandatory" : "Normal"
        ]);

        doc.setFontSize(18);
        doc.text("Enrollment Statistics Report", 14, 20);
        doc.setFontSize(11);
        doc.text(`Semester: ${semesterId} | Filter: ${typeFilter} | Total: ${filteredData.length}`, 14, 30);

        autoTable(doc, {
            startY: 40,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], halign: 'center' },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 35 },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' }
            },
            styles: { fontSize: 8, cellPadding: 2 }
        });

        doc.save(`Enrollment_Report_${semesterId}.pdf`);
    };

    if (loading) return <div className="loading">Analyzing Enrollment Data...</div>;

    return (
        <div className="management-container prereg-container">
            {/* Header */}
            <div className="prereg-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button onClick={() => navigate(-1)} className="back-btn-round" >
                            <FaArrowLeft />
                        </button>
                        <h2>Live Enrollment</h2>
                    </div>
                    <button className="btn-2" onClick={exportToPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Statistics Cards (Clickable) */}
            <div className="insights-grid">
                <div
                    className={`insight-card university-stats clickable-card`}
                    onClick={() => setTypeFilter('All')}
                >
                    <div className="insight-header">
                        <span className="insight-icon icon-blue"><BookOpen size={18} /></span>
                        <span className="insight-label">Total Offerings</span>
                    </div>
                    <div className="insight-value-large">{stats.total}</div>
                    <div className="insight-footer">Active Semester Courses</div>
                </div>

                <div
                    className={`insight-card clickable-card ${typeFilter === 'Empty' ? 'active-card card-empty' : ''}`}
                    onClick={() => handleCardClick('Empty')}
                >
                    <div className="insight-header">
                        <span className="insight-icon icon-orange"><AlertCircle size={18} /></span>
                        <span className="insight-label">Empty Courses</span>
                    </div>
                    <div className="insight-value">{stats.empty}</div>
                    <div className="insight-footer">0 Students enrolled</div>
                </div>

                <div
                    className={`insight-card clickable-card ${typeFilter === 'Graduates' ? 'active-card card-grads' : ''}`}
                    onClick={() => handleCardClick('Graduates')}
                >
                    <div className="insight-header">
                        <span className="insight-icon icon-green"><GraduationCap size={18} /></span>
                        <span className="insight-label">Graduation Critical</span>
                    </div>
                    <div className="insight-value">{stats.withGrads}</div>
                    <div className="insight-footer">Contains seniors</div>
                </div>

                <div
                    className={`insight-card clickable-card ${typeFilter === 'Suggestions' ? 'active-card card-suggestions' : ''}`}
                    onClick={() => handleCardClick('Suggestions')}
                >
                    <div className="insight-header">
                        <span className="insight-icon icon-red"><AlertCircle size={18} style={{ color: typeFilter === 'Suggestions' ? 'inherit' : '#ef4444' }} /></span>
                        <span className="insight-label">Suggestions</span>
                    </div>
                    <div className="insight-value" style={{ color: typeFilter === 'Suggestions' ? 'inherit' : '#ef4444' }}>{stats.suggestions}</div>
                    <div className="insight-footer">Recommended to close</div>
                </div>
            </div>

            {/* Controls */}
            <div className="table-controls">
                <div className="search-in-prereg-box">
                    <Search size={20} color="#9ca3af" />
                    <input
                        type="text"
                        placeholder="Search by name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="drop-filters-group">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-dropdown">
                        <option value="All">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                    </select>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="filter-dropdown">
                        <option value="All">All Types</option>
                        <option value="Graduates">With Graduates</option>
                        <option value="Empty">Zero Enrollment</option>
                        <option value="Suggestions">Suggestions</option>
                    </select>
                </div>
            </div>

            {/* Main Table */}
            <div className="table-wrapper">
                <table className="management-data-table">
                    <thead>
                        <tr>
                            <th>Course Details</th>
                            <th>Staff (Inst/TA)</th>
                            <th>Status</th>
                            <th>Students</th>
                            <th>Graduating</th>
                            <th>System Hint</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(off => (
                            <tr key={off._id}>
                                <td className="fetchCourse clickable-cell" onClick={() => handleViewStudents(off.courseId?._id, off._id, off.courseId?.courseName, off.instructorId, off.taId)}>
                                    <div className="c-name">{off.courseId?.courseName || "Unknown Course"}</div>
                                    <div className="c-id">{off.courseId?._id || off.courseId}</div>
                                </td>
                                {/* خلية المدرس والمعيد المضافة */}
                                <td style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                                    <div style={{ color: '#3b82f6', fontWeight: '500' }}>I: {off.instructorId || '-'}</div>
                                    <div style={{ color: '#6b7280' }}>T: {off.taId || '-'}</div>
                                </td>
                                <td>
                                    <span className={`status-badge ${off.status === 'open' ? 'live' : 'draft'}`}>
                                        {off.status ? off.status.toUpperCase() : 'N/A'}
                                    </span>
                                </td>
                                <td className="fetchCourse clickable-cell" onClick={() => handleViewStudents(off.courseId?._id, off._id, off.courseId?.courseName, off.instructorId, off.taId)}>
                                    {off.enrolledCount || 0}
                                </td>
                                <td className="text-center">
                                    <span className={(off.graduatingCount || 0) > 0 ? "g-critical" : "g-normal"}>
                                        {off.graduatingCount || 0}
                                    </span>
                                </td>
                                <td>
                                    {(off.enrolledCount || 0) < 5 && off.status === 'open' && (off.graduatingCount || 0) === 0 ? (
                                        <span className="h-low-demand">
                                            <AlertCircle size={14} /> Low Demand
                                        </span>
                                    ) : (off.graduatingCount || 0) > 0 ? (
                                        <span className="h-mandatory">
                                            <CheckCircle2 size={14} /> Mandatory
                                        </span>
                                    ) : <span className="h-normal">Normal</span>}
                                </td>
                                <td className="text-center">
                                    <button
                                        className={`status-toggle-btn ${off.status === 'open' ? 'st-close' : 'st-open'}`}
                                        onClick={() => handleToggleStatus(off._id, off.status)}
                                    >
                                        {off.status === 'open' ? <Lock size={14} /> : <Unlock size={14} />}
                                        {off.status === 'open' ? 'Close' : 'Open'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredData.length === 0 && (
                    <div className="table-no-data">
                        No courses found matching your criteria.
                    </div>
                )}
            </div>

            {/* Students Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Students Enrolled in: {selectedCourse}</h3>
                            <button className="close-modal" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {loadingStudents ? (
                                <div className="loader">Loading students list...</div>
                            ) : students.length > 0 ? (
                                <div className="table-wrapper">
                                    <table className="students-list-table">
                                        <thead>
                                            <tr>
                                                <th>Student ID</th>
                                                <th>Student Name</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map((item) => (
                                                <tr key={item.studentId?._id}>
                                                    <td>{item.studentId?._id}</td>
                                                    <td>{item.studentId?.studentName}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="no-data">No students enrolled in this course yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnrollmentStatsPage;