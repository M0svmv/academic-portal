// src/config/menuConfig.js
import {
    LayoutDashboard,
    BookOpen,
    Users,
    Award,
    GraduationCap,
    Settings,
    History,
    UserCheck,
    Library,
    Briefcase,
    FileSpreadsheet,
    Megaphone,
    ClipboardCheck,
    ScrollText,
    BookMarked,
    ShieldCheck,
    UserCog,
    Calendar,
    CalendarDays,
    BellRing,
    MessagesSquare,
    FileText,
    Layers,
    Clock,
    // أيقونات جديدة لتحسين الشكل
    GitPullRequestDraft,
    MonitorCheck,
    GanttChart,
    UserRoundCheck,
    Contact2,
    CalendarRange,
    Settings2,
    Trophy
} from "lucide-react";

const iconSize = 20;

export const menuConfig = {
    student: [
        {
            name: "Dashboard",
            path: "/student/dashboard",
            icon: <LayoutDashboard size={iconSize} />
        },
        {
            name: "Pre-Registration",
            path: "/student/registration",
            icon: <FileSpreadsheet size={iconSize} />
        },
        {
            name: "My Transcript",
            path: "/student/transcript",
            icon: <ScrollText size={iconSize} />
        },
        {
            name: "Meet Advisor",
            path: "/student/meetings",
            icon: <MessagesSquare size={iconSize} />
        },
        {
            name: "Schedule",
            path: "/student/St-Schedule",
            icon: <CalendarDays size={iconSize} />
        },
        {
            name: "Requests",
            path: "/student/St-Requests",
            icon: <GitPullRequestDraft size={iconSize} />
        },
    ],

    coordinator: [
        {
            name: "Dashboard",
            path: "/staff/coordinator/dashboard",
            icon: <LayoutDashboard size={iconSize} />
        },
        {
            name: "Semesters Management",
            path: "/staff/coordinator/semester-Manage",
            icon: <History size={iconSize} />
        },
        {
            name: "Pre-Registration",
            path: "/staff/coordinator/registration",
            icon: <ClipboardCheck size={iconSize} />
        },
        {
            name: "Students Management",
            path: "/staff/coordinator/students",
            icon: <Users size={iconSize} />
        },
        {
            name: "Courses Management",
            path: "/staff/coordinator/program-courses",
            icon: <Library size={iconSize} />
        },
        {
            name: "Staff Management",
            path: "/staff/coordinator/ece-staff",
            icon: <Contact2 size={iconSize} />
        },
        {
            name: "Advising Management",
            path: "/staff/coordinator/Advising-management",
            icon: <UserRoundCheck size={iconSize} />
        },
        {
            name: "Anouncements",
            path: "/staff/coordinator/Anouncements",
            icon: <BellRing size={iconSize} />
        },
        {
            name: "Schedule",
            path: "/staff/coordinator/ScheduleManager",
            icon: <CalendarRange size={iconSize} />
        },
        {
            name: "Requests",
            path: "/staff/coordinator/coo-Requests",
            icon: <GitPullRequestDraft size={iconSize} />
        },
    ],

    lecturer: [
        {
            name: "Dashboard",
            path: "/staff/lecturer/dashboard",
            icon: <LayoutDashboard size={iconSize} />
        },
        {
            name: "My Courses",
            path: "/staff/lecturer/lec-courses",
            icon: <BookMarked size={iconSize} />
        },
        {
            name: "Schedule",
            path: "/staff/lecturer/lec-Schedule",
            icon: <CalendarDays size={iconSize} />
        },
        {
            name: "Anouncements",
            path: "/staff/lecturer/Lec-anouncements",
            icon: <Megaphone size={iconSize} />
        }
    ],

    "academic-advisor": [
        {
            name: "Dashboard",
            path: "/staff/academic-advisor/dashboard",
            icon: <LayoutDashboard size={iconSize} />
        },
        {
            name: "My Students",
            path: "/staff/academic-advisor/advise-students",
            icon: <GraduationCap size={iconSize} />
        },
        {
            name: "Anouncements",
            path: "/staff/academic-advisor/advising-anouncements",
            icon: <Megaphone size={iconSize} />
        },
        {
            name: "Meetings",
            path: "/staff/academic-advisor/ad-meetings",
            icon: <Calendar size={iconSize} />
        },
        {
            name: "Requests",
            path: "/staff/academic-advisor/Adv-Requests",
            icon: <GitPullRequestDraft size={iconSize} />
        },
    ],

    ta: [
        {
            name: "Dashboard",
            path: "/staff/ta/dashboard",
            icon: <LayoutDashboard size={iconSize} />
        },
        {
            name: "Assist Courses",
            path: "/staff/ta/ta-courses",
            icon: <BookOpen size={iconSize} />
        },
        {
            name: "Schedule",
            path: "/staff/ta/ta-Schedule",
            icon: <CalendarDays size={iconSize} />
        },
        {
            name: "Anouncements",
            path: "/staff/ta/TA-anouncements",
            icon: <Megaphone size={iconSize} />
        }
    ],

    admin: [
        {
            name: "Dashboard",
            path: "/staff/admin/dashboard",
            icon: <ShieldCheck size={iconSize} />
        },
        {
            name: "User Management",
            path: "/staff/admin/users",
            icon: <UserCog size={iconSize} />
        },
        {
            name: "System Settings",
            path: "/staff/admin/settings",
            icon: <Settings2 size={iconSize} />
        }
    ],

    "control-member": [
        {
            name: "Dashboard",
            path: "/staff/control/dashboard",
            icon: <MonitorCheck size={iconSize} />
        },
        {
            name: "Results Management",
            path: "/staff/control-member/results",
            icon: <Trophy size={iconSize} />
        },
        // {
        //     name: "Grades Audit",
        //     path: "/staff/control/audit",
        //     icon: <FileText size={iconSize} />
        // },
        // {
        //     name: "Results History",
        //     path: "/staff/control/history",
        //     icon: <History size={iconSize} />
        // }
    ]
};