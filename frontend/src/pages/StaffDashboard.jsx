import { useParams } from "react-router-dom";
import CoordinatorDashboard from "./coordinator pages/CoordinatorDashboard"
import AdvisorDashboard from "./academicAdvisor/AdvisorDashboard";
import LecturerDashboard from "./lecturer/LecturerDashboard";
import TaDashboard from "./TA/TaDashboard";
import ControlDashboard from "./controlMember/ControlDashboard"
import { FiLogOut, FiSettings, FiAlertTriangle, FiShield } from "react-icons/fi";
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
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "60vh"
                }}>
                    <div style={{
                        textAlign: "center",
                        padding: "2.5rem 2rem",

                    }}>
                        <div style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "50%",
                            background: "rgba(136, 132, 216, 0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 1.25rem"
                        }}>
                            <FiShield size={26} color="#6c63c9" />
                        </div>
                        <h3 style={{ fontWeight: 500, marginBottom: "0.5rem" }}>Admin Role</h3>
                        <p style={{ color: "#888", fontSize: "14px", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                            This role doesn't have a separate dashboard yet -<br />
                            Admin permissions are currently integrated within the Coordinator role.
                        </p>
                        <div style={{
                            background: "rgba(136, 132, 216, 0.12)",
                            borderRadius: "8px",
                            padding: "0.6rem 1rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "#6c63c9",
                            fontSize: "13px",
                            fontWeight: 500
                        }}>
                            Switch to Coordinator to access admin features
                        </div>
                    </div>
                </div>
            )}



            {role === "control" && (
                <ControlDashboard />
            )}
        </div>
    );
};

export default StaffDashboard;