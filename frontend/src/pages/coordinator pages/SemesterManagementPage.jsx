import { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import swalService from "../../services/swal";
import SemesterModal from "../../components/SemesterModal";
import SemesterTimeline from "../../components/SemesterTimeline";
import { AlertTriangle, Plus, CheckCircle2, History, Loader2, Trash2 } from 'lucide-react';

const SemesterManagementPage = () => {
    const [semesters, setSemesters] = useState([]);
    const [currentSemester, setCurrentSemester] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");
    const semesterData = currentSemester;

    const notifySemesterChange = () => {
        window.dispatchEvent(new Event("semesterUpdated"));
    };

    useEffect(() => {
        fetchAllSemesters();
    }, []);

    const fetchAllSemesters = async () => {
        try {
            setLoading(true);
            const res = await api.get("/semesters");

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

            notifySemesterChange();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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
            await fetchAllSemesters();
        } catch (err) {
            swalService.error("Error", "Failed to stop semester.");
        }
    };

    const handleDeleteSemester = async (id, name) => {
        const result = await swalService.confirm(
            "DELETE SEMESTER",
            `Are you sure you want to delete ${name}? This action cannot be undone.`,
            "Yes, Delete",
            "error"
        );
        if (!result.isConfirmed) return;
        try {
            await api.delete(`/semesters/${id}`);
            swalService.success("Deleted", "Semester deleted successfully.");
            await fetchAllSemesters();
        } catch (err) {
            swalService.error("Error", "Failed to delete semester.");
        }
    };

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
            <h3>Loading Semesters...</h3>
        </div>
    );

    return (
        <div className="management-container">
            <div className="prereg-header">
                <h2>Semesters Management</h2>
                {!currentSemester && (
                    <button className="btn-1" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Initialize New Semester
                    </button>
                )}
            </div>

            {currentSemester && (
                <div className="current-semester-card" >
                    <div className="current-semester-current" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Current Semester: <span style={{ color: '#365ca0' }}>{currentSemester.name}</span></h3>
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
                            <th>Actions</th>
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
                                    {(sem.isCurrent && sem.settings?.allowEnrollment) ? "Open" : "Closed"}
                                </td>
                                <td>
                                    <button
                                        onClick={() => handleDeleteSemester(sem._id, sem.name)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                        title="Delete Semester"
                                    >
                                        <Trash2 size={18} />
                                    </button>
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