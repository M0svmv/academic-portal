import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Cookies from "js-cookie";

import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./pages/StudentDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import StudentTranscript from "./pages/StudentTranscript";
import StudentDetails from "./pages/coordinator pages/StudentDetails";
import StudentMeetings from "./pages/StudentMeetings";
import StudentSchedule from "./pages/student pages/StudentSchedule";
import StudentRequestsManagement from "./pages/student pages/StudentRequestsManagement"

import PreRegistrationManagement from "./pages/coordinator pages/PreRegistrationManagementPage";
import EnrollmentStatsPage from "./pages/coordinator pages/EnrollmentStatsPage";
import Students from "./pages/coordinator pages/Students";
import ProgramCoursesManagement from "./pages/coordinator pages/ProgramCoursesMnagement";
import CourseStudentsPage from "./pages/coordinator pages/CourseStudentsPage";
import StaffManagement from "./pages/coordinator pages/StaffMnagement";
import AdvisingManagementPage from "./pages/coordinator pages/AdvisingManagementPage";
import AdvisingDetailsPage from "./pages/coordinator pages/AdvisingDetailsPage";
import Announcements from "./pages/coordinator pages/Announcements";
import UnassignedStudentsPage from "./pages/coordinator pages/UnassignedStudentsPage";
import CooEnrollmentPage from "./pages/coordinator pages/CooEnrollmentPage";
import ScheduleManager from "./pages/coordinator pages/ScheduleManager";
import CoordinatorAcademicRequests from "./pages/coordinator pages/CoordinatorAcademicRequests"

import AdviseStudents from "./pages/academicAdvisor/AdviseStudents";
import AdvisingAnnouncements from "./pages/academicAdvisor/AdvisingAnnouncements";
import AdvisingMeetings from "./pages/academicAdvisor/AdvisingMeetings";
import AdviserEnrollmentPage from "./pages/academicAdvisor/AdviserEnrollmentPage";
import AdvisedStudentDetails from "./pages/academicAdvisor/AdvisedStudentDetails";
import AdvisorAcademicRequests from "./pages/academicAdvisor/AdvisorAcademicRequests";

import MyCourses from "./pages/lecturer/MyCourses";
import CourseGrading from "./pages/lecturer/CourseGrading";
import CourseDetails from "./pages/lecturer/CourseDetails";
import AttendanceManagement from "./pages/lecturer/AttendanceManagement";
import LecAnnouncements from "./pages/lecturer/LecAnnouncements"

import MyCoursesTA from "./pages/TA/MyCoursesTA";
import CourseGradingTA from "./pages/TA/CourseGradingTA";
import AttendanceManagementTA from "./pages/TA/AttendanceManagementTA";
import LecSchedule from "./pages/lecturer/LecSchedule";
import TASchedule from "./pages/TA/TASchedule";
import TAAnnouncements from "./pages/TA/TAAnnouncements"

import StudentCourseOfferingsPage from "./pages/student pages/CourseOffering";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./pages/AppLayout";
import Profile from "./pages/Profile";
import "./App.css";

function App() {
  const token = Cookies.get("token");

  return (
    <Router>
      <Routes>

        {/* Login Route */}
        <Route
          path="/login"
          element={<LoginPage />}
        />

        {/* Student Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="profile" element={<Profile />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="transcript" element={<StudentTranscript />} />
          {/* <Route path="courses" element={<Courses />} /> */}

          <Route path="meetings" element={<StudentMeetings />} />
          <Route path="registration" element={<StudentCourseOfferingsPage />} />
          <Route path="St-Schedule" element={<StudentSchedule />} />
          <Route path="St-Requests" element={<StudentRequestsManagement />} />
        </Route>

        {/* Staff Routes */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute role="staff">
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="profile" element={<Profile />} />
          <Route path=":role/dashboard" element={<StaffDashboard />} />
          <Route path=":role/students" element={<Students />} />
          <Route path=":role/registration" element={<PreRegistrationManagement />} />
          <Route path=":role/enrollment-stats/:semesterId" element={<EnrollmentStatsPage />} />
          <Route path=":role/students/:id" element={<StudentDetails />} />
          <Route path=":role/program-courses" element={<ProgramCoursesManagement />} />
          <Route path=":role/ece-staff" element={<StaffManagement />} />
          <Route path=":role/semester/:semesterId/course/:courseId/:offeringId/students" element={<CourseStudentsPage />} />

          <Route path=":role/Advising-management" element={<AdvisingManagementPage />} />
          <Route path=":role/advising/details/:advisorId" element={<AdvisingDetailsPage />} />
          <Route path=":role/Anouncements" element={<Announcements />} />
          <Route path=":role/advising/unassigned" element={<UnassignedStudentsPage />} />
          <Route path=":role/coordinator/enroll/:studentId" element={<CooEnrollmentPage />} />
          <Route path=":role/ScheduleManager" element={<ScheduleManager />} />
          <Route path=":role/coo-Requests" element={<CoordinatorAcademicRequests />} />

          {/* _______________ */}
          <Route path=":role/advise-students" element={<AdviseStudents />} />
          <Route path=":role/advising-anouncements" element={<AdvisingAnnouncements />} />
          <Route path=":role/ad-meetings" element={<AdvisingMeetings />} />

          <Route path=":role/advisor/enroll/:studentId" element={<AdviserEnrollmentPage />} />
          <Route path=":role/student/:id" element={<AdvisedStudentDetails />} />
          <Route path=":role/Adv-Requests" element={< AdvisorAcademicRequests />} />

          {/* _______________ */}
          <Route path=":role/lec-courses" element={<MyCourses />} />
          <Route path=":role/grading/:id/:courseId" element={<CourseGrading />} />
          <Route path=":role/courses/:courseId" element={<CourseDetails />} />
          <Route path=":role/grading/:id/attendance" element={<AttendanceManagement />} />
          <Route path=":role/lec-Schedule" element={<LecSchedule />} />
          <Route path=":role/Lec-anouncements" element={<LecAnnouncements />} />
          {/* _______________ */}
          <Route path=":role/ta-courses" element={<MyCoursesTA />} />
          <Route path=":role/ta-grading/:id/:courseId" element={<CourseGradingTA />} />
          <Route path=":role/ta-grading/:id/attendance" element={<AttendanceManagementTA />} />
          <Route path=":role/ta-Schedule" element={<TASchedule />} />
          <Route path=":role/TA-anouncements" element={<TAAnnouncements />} />
        </Route>



        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Unknown Routes */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </Router>
  );
}

export default App;