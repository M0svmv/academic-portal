import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import Cookies from "js-cookie";
import api from "../services/api";
import "./styles/LoginPage.css";
import swalService from "../services/swal"; // استدعاء السيرفيس للتنبيه

const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [roleType, setRoleType] = useState("student");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const endpoint = roleType === "student" ? "/student/login" : "/staff/login";

            const { data } = await api.post(endpoint, { username, password });


            if (!data.token) {
                throw new Error("No token returned from server");
            }

            Cookies.set("token", data.token, { expires: 1 });

            const userRes = await api.get(roleType === "student" ? "/student/me" : "/staff/me");
            const user = userRes.data;


            Cookies.set("currentUser", JSON.stringify(user), { expires: 1 });

            // --- منطق فحص البيانات الناقصة ---
            const email = roleType === "student" ? user.studentEmail : user.email;
            const phone = roleType === "student" ? user.studentPhone : user.phone;

            const isDataMissing = !email || !phone || email.trim() === "" || phone.trim() === "";

            if (roleType === "student") {
                Cookies.set("userType", "student", { expires: 1 });
                if (isDataMissing) {
                    // توجيه للبروفايل مع بعت معلومة إن الداتا ناقصة
                    navigate("/student/profile", { state: { forceEdit: true }, replace: true });
                } else {
                    navigate("/student/dashboard", { replace: true });
                }
            } else {
                const roles = user.roles || [];
                if (roles.length === 0) {
                    setError("This staff account has no roles assigned.");
                    return;
                }
                const firstRole = roles[0];
                Cookies.set("activeRole", firstRole, { expires: 1 });
                Cookies.set("userType", "staff", { expires: 1 });

                if (isDataMissing) {
                    // توجيه لبروفايل الموظف مع بعت معلومة إن الداتا ناقصة
                    navigate("/staff/profile", { state: { forceEdit: true }, replace: true });
                } else {
                    navigate(`/staff/${firstRole}/dashboard`, { replace: true });
                }
            }
        } catch (err) {
            console.error("Login error:", err);
            setError(err.response?.data?.message || err.message || "Invalid login credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-left">
                    <div className="left-content">
                        <img
                            src="/images/orbitLogo.png"
                            alt="ECE Logo"
                            className="login-logo"
                        />
                        <h2>Orbit Academic Portal</h2>
                    </div>
                </div>

                <div className="login-right">
                    <form className="login-form" onSubmit={handleLogin}>

                        <div className="login-role">
                            <label>
                                <input
                                    type="radio"
                                    value="student"
                                    checked={roleType === "student"}
                                    onChange={() => setRoleType("student")}
                                />
                                <span>Student</span>
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    value="staff"
                                    checked={roleType === "staff"}
                                    onChange={() => setRoleType("staff")}
                                />
                                <span>Staff</span>
                            </label>
                        </div>

                        <div className="input-group">
                            <User size={20} className="input-icon" />
                            <input
                                type="text"
                                placeholder="UserName ..."
                                className="login-input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <Lock size={20} className="input-icon" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password ..."
                                className="login-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="eye-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        {error && <p className="error">{error}</p>}

                        <button type="submit" className="btn-1" disabled={loading}>
                            {loading ? "Logging in..." : "Login"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;