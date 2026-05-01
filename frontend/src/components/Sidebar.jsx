import { NavLink } from "react-router-dom";
import Cookies from "js-cookie";
import "./Sidebar.css";

const Sidebar = () => {
    const userType = Cookies.get("userType");

    return (
        <div className="sidebar">
            <h2 className="logo">ECE Portal</h2>

            <nav>

                <NavLink to={`/${userType}/dashboard`}>Dashboard</NavLink>

                {userType === "student" && (
                    <>
                        <NavLink to="/student/courses">My Courses</NavLink>
                        <NavLink to="/student/grades">Grades</NavLink>
                    </>
                )}

                {userType === "staff" && (
                    <>
                        <NavLink to="/staff/students">Students</NavLink>
                        <NavLink to="/staff/courses">Courses</NavLink>
                    </>
                )}

            </nav>
        </div>
    );
};

export default Sidebar;