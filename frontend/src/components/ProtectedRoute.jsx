import { Navigate } from "react-router-dom";
import Cookies from "js-cookie";

const ProtectedRoute = ({ role, children }) => {
    const token = Cookies.get("token");
    const userType = Cookies.get("userType");

    if (!token) return <Navigate to="/login" replace />;

    if (role === "staff" && userType !== "staff") return <Navigate to="/login" replace />;
    if (role === "student" && userType !== "student") return <Navigate to="/login" replace />;

    return children;
};

export default ProtectedRoute;