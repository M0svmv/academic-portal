import { useParams } from "react-router-dom";
import CoordinatorDashboard from "./coordinator pages/CoordinatorDashboard"
import AdvisorDashboard from "./academicAdvisor/AdvisorDashboard"

const StaffDashboard = () => {
    const { role } = useParams();

    return (
        <div>
            {/* Example Content Based on Role */}
            {role === "coordinator" && (
                <CoordinatorDashboard />
            )}

            {role === "lecturer" && (
                <AdvisorDashboard />
            )}

            {role === "academic-advisor" && (
                <AdvisorDashboard />
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