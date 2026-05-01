import { useParams } from "react-router-dom";

const StaffDashboard = () => {
    const { role } = useParams();

    return (
        <div className="management-container">
            <h2>{role ? role.replace("-", " ").toUpperCase() : "Staff"} Dashboard</h2>

            {/* Example Content Based on Role */}
            {role === "coordinator" && (
                <p>Here you can manage courses, view students, and check semester history.</p>
            )}

            {role === "lecturer" && (
                <p>Here you can view your courses and manage your class materials.</p>
            )}

            {role === "academic-advisor" && (
                <p>Here you can advise students and manage academic plans.</p>
            )}

            {role === "ta" && (
                <p>Here you can assist courses and support lecturers.</p>
            )}

            {role === "admin" && (
                <p>Here you can manage users and system settings.</p>
            )}
        </div>
    );
};

export default StaffDashboard;