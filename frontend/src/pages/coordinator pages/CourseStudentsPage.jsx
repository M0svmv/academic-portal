import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import {
    ArrowLeft, Search, Users, Eye, UserPlus, X,
    GraduationCap, Filter, FileText, Layout, Info, UserCheck
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/StudentDetails.css";

const CourseStudentsPage = () => {
    const { semesterId, courseId, offeringId, role } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const courseName = location.state?.courseName || "Course Students";

    // استلام بيانات الاستاف من الـ state
    const currentInstructor = location.state?.instructorId;
    const currentTA = location.state?.taId;

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // فلاتر إضافية
    const [selectedLevel, setSelectedLevel] = useState("All");
    const [selectedRegulation, setSelectedRegulation] = useState("All");

    // States للمودال والستاف
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState("instructor");
    const [lecturers, setLecturers] = useState([]);
    const [tas, setTas] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState("");
    const [assigning, setAssigning] = useState(false);

    const levels = ["freshman", "sophomore", "junior", "senior", "senior-1", "senior-2", "graduated"];
    const regulations = ["last", "New"];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/semester-work/course/${courseId}`);
                setStudents(res.data || []);

                const staffRes = await api.get("/staff");
                setLecturers(staffRes.data.filter(s => s.roles.includes("lecturer")));
                setTas(staffRes.data.filter(s => s.roles.includes("ta")));
            } catch (err) {
                console.error("Error fetching data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [courseId]);

    // منطق التصفية الموحد
    const filteredStudents = useMemo(() => {
        return students.filter(item => {
            const matchesSearch = item.studentId?.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.studentId?._id?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLevel = selectedLevel === "All" || item.studentId?.transcript?.level === selectedLevel;
            const matchesReg = selectedRegulation === "All" || item.studentId?.transcript?.regulation === selectedRegulation;

            return matchesSearch && matchesLevel && matchesReg;
        });
    }, [students, searchTerm, selectedLevel, selectedRegulation]);

    // الإحصائيات بناءً على الطلبة المفلترين حالياً
    const stats = useMemo(() => {
        const counts = {
            total: filteredStudents.length,
            newReg: filteredStudents.filter(s => s.studentId?.transcript?.regulation === "New").length,
            oldReg: filteredStudents.filter(s => s.studentId?.transcript?.regulation === "last").length,
            freshman: filteredStudents.filter(s => s.studentId?.transcript?.level === "freshman").length,
            sophomore: filteredStudents.filter(s => s.studentId?.transcript?.level === "sophomore").length,
        };
        return counts;
    }, [filteredStudents]);

    const handleAssignInstructor = async () => {
        if (!selectedStaff) return alert("Please select a lecturer");
        setAssigning(true);
        try {
            await api.post(`/course-offerings/${offeringId}/assign-instructor`, { instructorId: selectedStaff });
            alert("Instructor assigned successfully!");
            setIsModalOpen(false);
        } catch (err) {
            alert("Failed to assign instructor.");
        } finally {
            setAssigning(false);
        }
    };

    const handleAssignTA = async () => {
        if (!selectedStaff) return alert("Please select a TA");
        setAssigning(true);
        try {
            await api.post(`/course-offerings/${offeringId}/assign-ta`, { taId: selectedStaff });
            alert("TA assigned successfully!");
            setIsModalOpen(false);
        } catch (err) {
            alert("Failed to assign TA.");
        } finally {
            setAssigning(false);
        }
    };

    const openModal = (type) => {
        setModalType(type);
        setSelectedStaff("");
        setIsModalOpen(true);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`Enrolled Students Report: ${courseName}`, 14, 20);
        doc.setFontSize(11);
        doc.text(`Course ID: ${courseId} | Total: ${filteredStudents.length}`, 14, 30);

        const tableColumn = ["Student ID", "Student Name", "Level", "Regulation"];
        const tableRows = filteredStudents.map(s => [
            s.studentId?._id,
            s.studentId?.studentName,
            s.studentId?.transcript?.level || "N/A",
            s.studentId?.transcript?.regulation || "N/A"
        ]);


        autoTable(doc, {
            startY: 40,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }
        });

        doc.save(`${courseName}_Students.pdf`);
    };

    if (loading) return <div className="loading">Fetching Students List...</div>;

    return (
        <div className="management-container student-details-wrapper">
            <div className="details-header">
                <div className="header-left">
                    <button className="back-btn-round" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className="student-main-info">
                        <h2 style={{ fontSize: '1.5rem' }}>{courseName}</h2>
                        <div className="id-tags">
                            <span className="id-badge">Course ID: {courseId}</span>
                            <span className="id-badge">Semester: {semesterId}</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button className="btn-2" onClick={exportToPDF} >
                        <FileText size={18} />
                        Export Report
                    </button>
                    <button className="btn-1" onClick={() => openModal("instructor")}>
                        <UserPlus size={18} />
                        Assign Lecturer
                    </button>
                    <button className="btn-1" onClick={() => openModal("ta")}>
                        <GraduationCap size={18} />
                        Assign TA
                    </button>
                </div>
            </div>

            {/* عرض الـ Instructor والـ TA في بوكسات منقطة */}
            <div className="staff-assignment-overview" style={{
                display: 'flex',
                justifyContent: 'space-around',

                marginTop: '15px',
                padding: '10px',
                border: '2px dashed #e5e7eb',
                borderRadius: '12px',
                backgroundColor: '#fcfcfd'
            }}>
                <div style={{ display: 'flex', width: '50%', alignItems: 'center', gap: '10px', padding: '5px 15px', borderRight: '1px solid #e5e7eb' }}>
                    <UserCheck size={18} color="#3a86ff" />
                    <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', textTransform: 'uppercase' }}>Course Instructor</span>
                        <span style={{ fontWeight: '600', color: '#111827' }}>{currentInstructor || "Not Assigned"}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', width: '50%', alignItems: 'center', gap: '10px', padding: '5px 15px' }}>
                    <Users size={18} color="#06d6a0" />
                    <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', textTransform: 'uppercase' }}>Teaching Assistant</span>
                        <span style={{ fontWeight: '600', color: '#111827' }}>{currentTA || "Not Assigned"}</span>
                    </div>
                </div>
            </div>

            {/* Insight Cards Section */}
            <div className="insight-cards-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginTop: '20px'
            }}>
                {/* Card 1: Total Students */}
                <div className="insight-card">
                    <div className="advisor-info-row">
                        <div className="insight-icon icon-blue">
                            <Users size={22} />
                        </div>
                        <div className="stat-info">
                            <h6 className="label" style={{ fontSize: '0.75rem', marginBottom: '5px' }}>Total (Filtered)</h6>
                            <p className="insight-value">{stats.total} Students</p>
                        </div>
                    </div>
                </div>

                {/* Card 2: New Regulation */}
                <div className="insight-card">
                    <div className="advisor-info-row">
                        <div className="insight-icon" style={{ backgroundColor: 'rgba(251, 86, 7, 0.1)', color: '#fb5607' }}>
                            <Layout size={22} />
                        </div>
                        <div className="stat-info">
                            <h6 className="label" style={{ fontSize: '0.75rem', marginBottom: '5px' }}>New Regulation</h6>
                            <p className="insight-value">{stats.newReg}</p>
                        </div>
                    </div>
                </div>

                {/* Card 3: Last Regulation */}
                <div className="insight-card">
                    <div className="advisor-info-row">
                        <div className="insight-icon" style={{ backgroundColor: 'rgba(255, 0, 110, 0.1)', color: '#ff006e' }}>
                            <Info size={22} />
                        </div>
                        <div className="stat-info">
                            <h6 className="label" style={{ fontSize: '0.75rem', marginBottom: '5px' }}>Last Regulation</h6>
                            <p className="insight-value">{stats.oldReg}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="data-section" style={{ marginTop: '30px' }}>
                {/* Advanced Filters Row */}
                <div className="filter-search-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                    <div className="search-box" style={{ flex: '2', minWidth: '300px' }}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="filter-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={16} color="#667085" />
                        <select
                            className="modal-select"
                            style={{ padding: '8px', width: '150px', marginTop: 0 }}
                            value={selectedLevel}
                            onChange={(e) => setSelectedLevel(e.target.value)}
                        >
                            <option value="All">All Levels</option>
                            {levels.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>

                    <div className="filter-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                            className="modal-select"
                            style={{ padding: '8px', width: '150px', marginTop: 0 }}
                            value={selectedRegulation}
                            onChange={(e) => setSelectedRegulation(e.target.value)}
                        >
                            <option value="All">All Regs</option>
                            {regulations.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Student Name</th>
                                <th>Level</th>
                                <th>Regulation</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((item) => (
                                    <tr key={item.studentId?._id}>
                                        <td className="bold">#{item.studentId?._id}</td>
                                        <td>{item.studentId?.studentName}</td>
                                        <td>
                                            <span className={`status-badge ${item.studentId?.transcript?.level}`}>
                                                {item.studentId?.transcript?.level}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="id-badge" style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>
                                                {item.studentId?.transcript?.regulation}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="view-btn-transparent"
                                                onClick={() => navigate(`/staff/${role}/students/${item.studentId?._id}`)}
                                            >
                                                <Eye size={18} color="#3a86ff" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="empty-msg">No students found matching current filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal بتصميم محسن و Inline Styles */}
            {
                isModalOpen && (
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
                                <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#667085' }}>
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
                                    className="modal-select"
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: '8px',
                                        border: '1px solid #d1d5db', outline: 'none', fontSize: '1rem'
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
                                <button className="cancel-btn" onClick={() => setIsModalOpen(false)} style={{
                                    padding: '10px 20px', borderRadius: '6px', border: '1px solid #d1d5db',
                                    backgroundColor: '#fff', cursor: 'pointer'
                                }}>
                                    Cancel
                                </button>
                                <button
                                    className="btn-1"
                                    onClick={modalType === "instructor" ? handleAssignInstructor : handleAssignTA}
                                    disabled={assigning}
                                >
                                    {assigning ? "Assigning..." : "Confirm Assignment"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default CourseStudentsPage;