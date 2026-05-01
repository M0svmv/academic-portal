import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Users, Search, Eye, PlusCircle,
    X, Trash2, BarChart3, AlertTriangle, BookOpen
} from "lucide-react";
import api from "../../services/api";
import "./styles/AdviseStudents.css";

const AdviseStudents = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterLevel, setFilterLevel] = useState("All");
    const { role } = useParams();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [studentTranscript, setStudentTranscript] = useState(null);
    const [availableOfferings, setAvailableOfferings] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);

    const [filterReg, setFilterReg] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");

    useEffect(() => {
        fetchAdvisingList();
    }, []);

    const fetchAdvisingList = async () => {
        try {
            setLoading(true);
            const res = await api.get("/academic-advisors/me/list");
            console.log(res.data)
            const advising = res.data[0];

            const mapped = advising.students.map((s) => ({
                id: s.student._id,
                name: s.student.studentName,
                GPA: s.student.transcript.GPA,
                regulation: s.student.transcript.regulation,
                level: s.student.transcript.level,
                atRisk: s.student.transcript.atRisk,
                alerts: s.student.transcript.alerts,
                registeredCredits: s.student.enrollment.currentEnrolledCredits,
                allowedCredits: s.student.enrollment.allowedCredits
            }));

            setStudents(mapped);
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEnrollModal = async (studentId) => {
        setIsModalOpen(true);
        setModalLoading(true);

        try {
            const [detailsRes, coursesRes] = await Promise.all([
                api.get(`/academic-advisors/me/students/current-enrollment/${studentId}`),
                api.get(`/academic-advisors/me/students/available-courses/${studentId}`)
            ]);

            setStudentTranscript(detailsRes.data);

            const mappedCurrent = (detailsRes.data.courses || []).map(c => ({
                _id: c.courseOfferingId._id,
                courseId: c.courseOfferingId.courseId
            }));

            setSelectedCourses(mappedCurrent);
            setAvailableOfferings(coursesRes.data.availableOfferings);

        } catch (err) {
            console.error("Modal Data Error:", err);
        } finally {
            setModalLoading(false);
        }
    };

    const addToDraft = (offeringId) => {
        const course = availableOfferings.find(c => c._id === offeringId);
        if (!course) return;

        const currentCredits = selectedCourses.reduce(
            (sum, c) => sum + c.courseId.courseCredits,
            0
        );

        if (currentCredits + course.courseId.courseCredits > studentTranscript.allowedCredits) {
            alert("Credit limit exceeded!");
            return;
        }

        if (!selectedCourses.find(c => c._id === offeringId)) {
            setSelectedCourses([...selectedCourses, course]);
        }
    };

    const stats = {
        total: students.length,
        atRisk: students.filter(s => s.atRisk).length,
        avgGPA: (
            students.reduce((acc, s) => acc + s.GPA, 0) /
            (students.length || 1)
        ).toFixed(2)
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch =
            s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesLevel = filterLevel === "All" || s.level === filterLevel;
        const matchesReg = filterReg === "All" || s.regulation === filterReg;

        const matchesStatus =
            filterStatus === "All" ||
            (filterStatus === "atRisk" && s.atRisk) ||
            (filterStatus === "good" && !s.atRisk);

        return matchesSearch && matchesLevel && matchesReg && matchesStatus;
    });

    if (loading) return <div className="adv-page">Loading Students...</div>;

    return (
        <div className="management-container adv-page">
            <header className="meeting-header">
                <div className="management-header meeting-header">
                    <div className="prereg-header">
                        <h2>Student Advising Management</h2>
                    </div>
                </div>
            </header>

            <div className="insights-grid">
                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-blue">
                            <Users size={18} />
                        </span>
                        <span className="insight-label">Total Students</span>
                    </div>
                    <div className="insight-value">{stats.total}</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-green">
                            <BookOpen size={18} />
                        </span>
                        <span className="insight-label">Filtered Students</span>
                    </div>
                    <div className="insight-value">{filteredStudents.length}</div>
                </div>

                <div className="insight-card">
                    <div className="insight-header">
                        <span className="insight-icon icon-orange">
                            <BarChart3 size={18} />
                        </span>
                        <span className="insight-label">Avg. GPA</span>
                    </div>
                    <div className="insight-value">{stats.avgGPA}</div>
                </div>
            </div>

            <div className="adv-controls">
                <div className="adv-search-wrapper">
                    <Search className="adv-search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search Student..."
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <select className="adv-filter-select" onChange={(e) => setFilterLevel(e.target.value)}>
                        <option value="All">All Levels</option>
                        {['Freshman', 'Sophomore', 'Junior', "senior-1", "senior-2", 'Senior'].map(l => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>

                    <select className="adv-filter-select" onChange={(e) => setFilterReg(e.target.value)}>
                        <option value="All">All Regulations</option>
                        <option value="New">New</option>
                        <option value="Last">Last</option>
                    </select>

                    <select className="adv-filter-select" onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="All">Status</option>
                        <option value="atRisk">At Risk</option>
                        <option value="good">Good Standing</option>
                    </select>
                </div>
            </div>

            <div className="table-wrapper">
                <table className="adv-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th style={{ textAlign: 'center' }}>GPA</th>
                            <th>Regulation</th>
                            <th>Level</th>
                            <th>Credits</th>
                            <th>Alerts</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map(s => (
                            <tr key={s.id} className={s.atRisk ? "row-at-risk" : ""}>
                                <td className="adv-student-id">#{s.id}</td>
                                <td>{s.name}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontWeight: '600' }}>{s.GPA}</span>
                                        {s.atRisk
                                            ? <div className="type-badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', width: 'fit-content' }}>At Risk</div>
                                            : <div className="type-badge" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', width: 'fit-content' }}>Good</div>
                                        }
                                    </div>
                                </td>
                                <td>
                                    <span className={`badge-reg reg-${s.regulation?.toLowerCase() === 'new' ? 'new' : 'last'}`}>
                                        {s.regulation}
                                    </span>
                                </td>
                                <td>
                                    <span className={`badge-level level-${s.level?.toLowerCase()}`}>
                                        {s.level}
                                    </span>
                                </td>
                                <td>{s.registeredCredits} / {s.allowedCredits}</td>
                                <td> {s.alerts > 0 ? s.alerts : "No Alerts"}</td>
                                <td className="adv-actions">
                                    <button onClick={() => navigate(`/staff/${role}/student/${s.id}`)} title="View Profile">
                                        <Eye size={18} color="#3a86ff" />
                                    </button>
                                    <button onClick={() => navigate(`/staff/${role}/advisor/enroll/${s.id}`)} title="Enroll Student">
                                        <PlusCircle size={18} color="#10b981" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdviseStudents;