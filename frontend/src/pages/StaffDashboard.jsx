import { useParams } from "react-router-dom";
import CoordinatorDashboard from "./coordinator pages/CoordinatorDashboard"

const StaffDashboard = () => {
    const { role } = useParams();

    return (
        <div>
            {/* Example Content Based on Role */}
            {role === "coordinator" && (
                <CoordinatorDashboard />
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



            {role === "control-member" && (
                <p>Here you can manage users and system settings.</p>
            )}
        </div>
    );
};

export default StaffDashboard;