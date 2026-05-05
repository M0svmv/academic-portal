import { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import swalService from "../../services/swal";
import SemesterModal from "../../components/SemesterModal";
import SemesterTimeline from "../../components/SemesterTimeline";
import { AlertTriangle, Plus, CheckCircle2, History } from 'lucide-react';

const SemesterManagementPage = () => {
    const [semesters, setSemesters] = useState([]);
    const [currentSemester, setCurrentSemester] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchAllSemesters();
    }, []);

    const fetchAllSemesters = async () => {
        try {
            setLoading(true);
            const res = await api.get("/semesters");

            // ترتيب الفصول: الحالي أولاً، ثم ترتيب الباقي من الأحدث للأقدم بناءً على تاريخ البدء
            const sortedSemesters = [...res.data].sort((a, b) => {
                if (a.isCurrent) return -1;
                if (b.isCurrent) return 1;
                return new Date(b.startDate) - new Date(a.startDate);
            });

            setSemesters(sortedSemesters);

            const current = res.data.find(s => s.isCurrent);
            if (current) {
                const detailRes = await api.get(`/semesters/${current._id}`);
                setCurrentSemester(detailRes.data);
            } else {
                setCurrentSemester(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleForceStop = async () => {
        const result = await swalService.confirm(
            "CRITICAL ACTION",
            "This will PERMANENTLY archive the current semester.",
            "Yes, End Semester",
            "error"
        );
        if (!result.isConfirmed) return;
        try {
            await api.put(`/semesters/${currentSemester._id}/forceStop`);
            swalService.success("Archived", "Semester closed successfully.");
            fetchAllSemesters();
        } catch (err) {
            swalService.error("Error", "Failed to stop semester.");
        }
    };

    if (loading) return <div>Loading Semesters...</div>;

    return (
        <div className="management-container">
            <div className="prereg-header">
                <h2>Semesters Management</h2>
                {!currentSemester && (
                    <button className="start-semester-btn" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Initialize New Semester
                    </button>
                )}
            </div>

            {currentSemester && (
                <div className="current-semester-card" >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Current Active Semester: <span style={{ color: '#2563eb' }}>{currentSemester.name}</span></h3>
                        <button className="close-semester-btn" onClick={handleForceStop}>
                            <AlertTriangle size={16} /> Force Stop Semester
                        </button>
                    </div>
                    <SemesterTimeline
                        startDate={currentSemester.startDate}
                        endDate={currentSemester.endDate}
                        timeLine={currentSemester.timeLine}
                        semesterId={currentSemester._id}
                        onUpdate={fetchAllSemesters}
                    />
                </div>
            )}

            <div className="table-wrapper">
                <table className="courses-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Semester Name</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Registration Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {semesters.map(sem => (
                            <tr key={sem._id} style={sem.isCurrent ? { background: '#f0f9ff', fontWeight: 'bold' } : {}}>
                                <td>
                                    {sem.isCurrent ?
                                        <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={16} /> Active</span> :
                                        <span style={{ color: '#64748b' }}>Archived</span>
                                    }
                                </td>
                                <td>{sem.name}</td>
                                <td>{new Date(sem.startDate).toLocaleDateString()}</td>
                                <td>{new Date(sem.endDate).toLocaleDateString()}</td>
                                <td>
                                    {/* نستخدم الحالة من currentSemester إذا كان هو الصف الحالي لضمان التحديث اللحظي */}
                                    {sem.isCurrent
                                        ? (currentSemester?.settings?.allowEnrollment ? "Open" : "Closed")
                                        : (sem.settings?.allowEnrollment ? "Open" : "Closed")
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <SemesterModal
                show={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={fetchAllSemesters}
            />
        </div>
    );
};

export default SemesterManagementPage;