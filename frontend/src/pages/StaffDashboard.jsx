import { useParams } from "react-router-dom";
import CoordinatorDashboard from "./coordinator pages/CoordinatorDashboard"
import AdvisorDashboard from "./academicAdvisor/AdvisorDashboard";
import LecturerDashboard from "./lecturer/LecturerDashboard";
import TaDashboard from "./TA/TaDashboard";
import ControlDashboard from "./controlMember/ControlDashboard"
const StaffDashboard = () => {
    const { role } = useParams();

    return (
        <div>
            {/* Example Content Based on Role */}
            {role === "coordinator" && (
                <CoordinatorDashboard />
            )}

            {role === "lecturer" && (
                <LecturerDashboard />
            )}

            {role === "academic-advisor" && (
                <AdvisorDashboard />
            )}

            {role === "ta" && (
                <TaDashboard />
            )}

            {role === "admin" && (
                <p>Here you can manage users and system settings.</p>
            )}



            {role === "control" && (
                <ControlDashboard />
            )}
        </div>
    );
};

export default StaffDashboard;