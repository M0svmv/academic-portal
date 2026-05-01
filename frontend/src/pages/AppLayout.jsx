import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import swalService from '../services/swal';
import { FiLogOut, FiMenu, FiChevronLeft, FiSettings, } from "react-icons/fi";
import { ChevronLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { menuConfig } from "../config/menuConfig";
import "./styles/AppLayout.css";


const roleColors = {
    admin: {
        bg: "rgba(136, 132, 216, 0.12)",   // #8884d8
        color: "#6c63c9"
    },
    student: {
        bg: "rgba(130, 202, 157, 0.12)",   // #82ca9d
        color: "#4caf7d"
    },
    coordinator: {
        bg: "rgba(255, 198, 88, 0.15)",    // #ffc658
        color: "#d4a537"
    },
    lecturer: {
        bg: "rgba(255, 128, 66, 0.12)",    // #ff8042
        color: "#e66a2c"
    },
    ta: {
        bg: "rgba(141, 209, 225, 0.12)",   // #8dd1e1
        color: "#4aa3b5"
    },
    "academic-advisor": {
        bg: "rgba(162, 143, 208, 0.12)",   // #a28fd0
        color: "#7b6bb8"
    }
};

const AppLayout = () => {
    const navigate = useNavigate();
    const userType = Cookies.get("userType") || "student";
    const user = JSON.parse(Cookies.get("currentUser") || "{}");

    const initialRole = Cookies.get("activeRole") || user.roles?.[0] || userType;

    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activeRole, setActiveRole] = useState(initialRole);

    const logout = async () => {
        const result = await swalService.confirm(
            "Logout?",
            "Are you sure you want to sign out of your account?",
            "Yes, logout"
        );

        if (result.isConfirmed) {
            Cookies.remove("token");
            Cookies.remove("userType");
            Cookies.remove("currentUser");
            Cookies.remove("activeRole");
            navigate("/login");
        }
    };
    const handleRoleChange = (newRole) => {
        setActiveRole(newRole);
        const roleMenuItems = menuConfig[newRole];
        const firstPath = roleMenuItems && roleMenuItems.length > 0
            ? roleMenuItems[0].path
            : "/";
        navigate(firstPath);
        swalService.success(
            "Role Switched",
            `You are now viewing the dashboard as ${newRole.replace('-', ' ')}`
        );
    };


    const menuItems = userType === "student"
        ? menuConfig.student
        : menuConfig[activeRole] || [];

    useEffect(() => {
        if (userType === "staff" && activeRole) {
            Cookies.set("activeRole", activeRole, { expires: 1 });
        }
    }, [activeRole, userType]);

    return (
        <div className="portal-container">
            {/* Mobile Menu Button */}
            <button className="mobile-toggle" onClick={() => setMobileOpen(true)}>
                <FiMenu size={20} />
            </button>
            {mobileOpen && <div className="overlay" onClick={() => setMobileOpen(false)} />}

            {/* Sidebar */}
            <div className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}>
                {/* Top Part */}
                <div className="sidebar-header">
                    <img src="/images/logo3.png" alt="logo" className="sidebar-logo" />
                    <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
                        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                </div>

                {/* Menu Items */}
                <ul className="sidebar-menu">
                    {menuItems.map((item) => (
                        <li key={item.path}>
                            <NavLink to={item.path} className="sidebar-link">
                                <span className="menu-icon">{item.icon}</span>
                                {!collapsed && <span>{item.name}</span>}
                            </NavLink>
                        </li>
                    ))}
                </ul>

                {/* Bottom Part (User Section) */}
                <div className="sidebar-footer">
                    {collapsed ? (
                        <div className="collapsed-user-trigger" onClick={() => setCollapsed(false)}>
                            <div className="avatar-placeholder">{user.username ? user.username.charAt(0).toUpperCase() : "U"}</div>
                        </div>
                    ) : (
                        <div className="user-card">
                            <div className="user-profile-info">
                                <div className="avatar-placeholder">{user.username ? user.username.charAt(0).toUpperCase() : "U"}</div>
                                <div className="user-details">
                                    <span className="user-name">{user.username || "User"}</span>
                                    {userType === "staff" && (
                                        <select
                                            value={activeRole}
                                            onChange={(e) => handleRoleChange(e.target.value)}
                                            className="role-dropdown"
                                            style={{
                                                borderColor: roleColors[activeRole]?.color,
                                                color: roleColors[activeRole]?.color,
                                                backgroundColor: roleColors[activeRole]?.bg
                                            }}

                                        >
                                            {user.roles.map((role) => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                    )}
                                    {userType === "student" && <span className="student-badge">Student</span>}
                                </div>
                            </div>

                            <div className="footer-actions">
                                <button className="action-btn settings" onClick={() => navigate(`/${userType}/profile`)}>
                                    <FiSettings size={22} />
                                </button>
                                <button className="action-btn logout" onClick={logout}>
                                    <FiLogOut size={22} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="main-content">
                <Outlet />
            </div>
        </div>
    );
};

export default AppLayout;