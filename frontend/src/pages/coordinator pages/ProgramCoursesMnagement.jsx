import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import swalService from "../../services/swal";
import { Plus, ChevronDown, FileUp, Trash2, Edit, Search, BookOpen, GitBranch, LayoutGrid, GraduationCap, Download, X, RotateCcw, Loader2 } from 'lucide-react';
import CourseModal from '../../components/CourseModal';
import CSVImportModal from '../../components/CSVImportModal';
import DependencyMap from '../../components/DependencyMap'; // استيراد الكومبوننت الجديد
import '../styles/ProgramCourses.css';

const VALID_TYPES = [
    "Core", "Program Elective",
    "General Elective 1", "General Elective 2", "General Elective 3",
    "Engineering Economy Elective", "Project Management Elective",
    "Engineering Physics Elective", "Engineering Mathematics Elective",
    "graduation-project",
    "training",
];

const VALID_LEVELS = ["freshman", "sophomore", "junior", "senior-1", "senior-2", "senior"];
const VALID_Regulations = ["New", "Last"];

const TYPE_COLORS = {
    "Core": "#fdf2cb",
    "elective": "#ffe1e1",
    "General Elective 1": "#f5f2ff",
    "General Elective 2": "#edfcf1",
    "General Elective 3": "#eaf4fd",
    "Engineering Economy Elective": "#a4de6c",
    "Project Management Elective": "#f8fbf5",
    "Engineering Physics Elective": "#f5f3fe",
    "Engineering Mathematics Elective": "#fff6ec",
    "graduation-project": "ffc658",
    "training": "#8dd1e1"
};

const ProgramCoursesManagement = () => {
    const [courses, setCourses] = useState([]);
    const [search, setSearch] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [modalType, setModalType] = useState(null);
    const [editingCourse, setEditingCourse] = useState(null);

    const [insightLevel, setInsightLevel] = useState('freshman');
    const [insightType, setInsightType] = useState('Core');
    const [showDependencyMap, setShowDependencyMap] = useState(false);

    const [filterLevel, setFilterLevel] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterCredits, setFilterCredits] = useState('');
    const [filterRegulation, setFilterRegulation] = useState('');

    const fetchCourses = async () => {
        try {
            const res = await api.get("/courses");
            setCourses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => { fetchCourses(); }, []);

    // تصفية الكورسات بناءً على البحث والفلاتر النشطة
    const filteredCourses = courses.filter(c =>
        (c.courseName.toLowerCase().includes(search.toLowerCase()) ||
            c._id.toLowerCase().includes(search.toLowerCase())) &&
        (filterLevel ? c.courseLevel === filterLevel : true) &&
        (filterType ? c.courseType === filterType : true) &&
        (filterCredits ? c.courseCredits === Number(filterCredits) : true) &&
        (filterRegulation ? c.courseRegulation === filterRegulation : true)
    );

    // ربط الإحصائيات بالجدول المصفى (filteredCourses) بدلاً من كامل الكورسات (courses)
    const stats = {
        total: filteredCourses.length,
        prereqCount: filteredCourses.filter(c => c.prerequisiteCourses && c.prerequisiteCourses.length > 0).length,
        levelCount: filteredCourses.filter(c => c.courseLevel === insightLevel).length,
        typeCount: filteredCourses.filter(c => c.courseType === insightType).length
    };

    // التحقق من وجود فلاتر نشطة لعرض شريط التحكم بها
    const hasActiveFilters = search || filterLevel || filterType || filterCredits || filterRegulation;

    // دالة لإعادة تعيين جميع الفلاتر
    const handleResetFilters = () => {
        setSearch('');
        setFilterLevel('');
        setFilterType('');
        setFilterCredits('');
        setFilterRegulation('');
    };

    const openModal = (type, course = null) => {
        setModalType(null);
        setEditingCourse(null);
        setTimeout(() => {
            setEditingCourse(course);
            setModalType(type);
        }, 0);
    };

    const handleSaveSingle = async (courseData) => {
        try {
            swalService.showLoading(editingCourse ? "Updating course..." : "Saving new course...");

            if (editingCourse) {
                await api.put(`/courses/${editingCourse._id}`, courseData);
                swalService.success("Updated!", "Course details have been modified.");
            } else {
                await api.post("/courses", courseData);
                swalService.success("Created!", "New course added to the program.");
            }

            setModalType(null);
            fetchCourses();
        } catch (err) {
            console.error(err);
            swalService.error("Save Failed", err.response?.data?.message || "Could not save course data.");
        }
    };

    const handleCSVUpload = async (courseList) => {
        try {
            swalService.showLoading("Importing course list...");
            await api.post("/courses/list", courseList);

            setModalType(null);
            fetchCourses();
            swalService.success("Import Successful", `${courseList.length} courses have been added.`);
        } catch (err) {
            console.error(err);
            swalService.error("Import Error", "Make sure the CSV format is correct and IDs are unique.");
        }
    };

    const deleteCourse = async (id) => {
        const result = await swalService.confirm(
            "Are you sure?",
            "This will permanently delete the course and may affect prerequisites for other courses.",
            "Yes, Delete it",
            "warning"
        );

        if (result.isConfirmed) {
            try {
                swalService.showLoading("Deleting...");
                await api.delete(`/courses/${id}`);

                swalService.success("Deleted", "Course has been removed from the system.", 1500);
                fetchCourses();
            } catch (err) {
                console.error(err);
                swalService.error("Delete Failed", "This course might be linked to active offerings.");
            }
        }
    };

    const handleExportCSV = () => {
        if (courses.length === 0) {
            swalService.error("Export Failed", "No courses available to export.");
            return;
        }

        const headers = ["ID", "Course Name", "Level", "Type", "Credits", "Prerequisites", "Regulation"];
        const csvRows = [
            headers.join(','),
            ...courses.map(c => [
                c._id,
                `"${c.courseName}"`,
                c.courseLevel,
                c.courseType,
                c.courseCredits,
                `"${Array.isArray(c.prerequisiteCourses) ? c.prerequisiteCourses.join('; ') : c.prerequisiteCourses || ''}"`,
                c.courseRegulation
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `program_courses_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="management-container">
            <header className="management-header">
                <div className="prereg-header">
                    <h2>Course Management</h2>
                </div>

                <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
                    {/* زر الإكسبورت المنفصل */}
                    <button className="btn-2" onClick={handleExportCSV}>
                        <Download size={18} /> Export CSV
                    </button>

                    <div className="split-button-container">
                        <button className="main-add-btn" onClick={() => openModal('single')}>
                            <Plus size={18} /> Add Item
                        </button>
                        <button className="dropdown-toggle-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                            <ChevronDown size={18} />
                        </button>
                        {dropdownOpen && (
                            <div className="split-dropdown-menu">
                                <button className="dropdown-item" onClick={() => { openModal('single'); setDropdownOpen(false); }}>
                                    <Plus size={14} /> Add One Item
                                </button>
                                <button className="dropdown-item" onClick={() => { openModal('csv'); setDropdownOpen(false); }}>
                                    <FileUp size={14} /> CSV Import
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Dynamic Insights Grid */}
            <div className="insights-grid">
                <div
                    className="insight-card clickable-card"
                    onClick={handleResetFilters}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="insight-header">
                        <span className="insight-icon icon-blue"><BookOpen size={18} /></span>
                        <span className="insight-label">Total Courses</span>
                    </div>
                    <div className="insight-value">{stats.total}</div>
                    <div className="insight-footer">Click to reset all filters</div>
                </div>

                <div
                    className="insight-card clickable-card"
                    onClick={() => setFilterLevel(insightLevel)}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="insight-header">
                        <span className="insight-icon icon-orange"><GraduationCap size={18} /></span>
                        <select
                            className="insight-select"
                            value={insightLevel}
                            onChange={(e) => {
                                e.stopPropagation(); // منع حدوث فلترة عند تغيير قيمة الدروب داون فقط دون الضغط على الكارت
                                setInsightLevel(e.target.value);
                            }}
                        >
                            {VALID_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div className="insight-value">{stats.levelCount}</div>
                    <div className="insight-footer">Click to filter table by level</div>
                </div>

                <div
                    className="insight-card clickable-card"
                    onClick={() => setFilterType(insightType)}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="insight-header">
                        <span className="insight-icon icon-green"><LayoutGrid size={18} /></span>
                        <select
                            className="insight-select"
                            value={insightType}
                            onChange={(e) => {
                                e.stopPropagation(); // منع حدوث فلترة عند تغيير قيمة الدروب داون فقط دون الضغط على الكارت
                                setInsightType(e.target.value);
                            }}
                        >
                            {VALID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="insight-value">{stats.typeCount}</div>
                    <div className="insight-footer">Click to filter table by type</div>
                </div>

                {/* كارد الدبندنسي ماب */}
                <div className="insight-card clickable-card" onClick={() => setShowDependencyMap(true)} style={{ cursor: 'pointer' }}>
                    <div className="insight-header">
                        <span className="insight-icon icon-purple"><GitBranch size={18} /></span>
                        <span className="insight-label">Chained Courses</span>
                    </div>
                    <div className="insight-value">{stats.prereqCount}</div>
                    <div className="insight-footer">View Dependency Map →</div>
                </div>
            </div>

            {/* Dependency Map Modal */}
            {showDependencyMap && (
                <DependencyMap
                    courses={courses}
                    onClose={() => setShowDependencyMap(false)}
                />
            )}

            <div className="filters-wrapper">
                <Search size={22} color="#9ca3af" />
                <input
                    className="search-input"
                    type="text"
                    placeholder="Search by ID or Name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select value={filterRegulation} onChange={e => setFilterRegulation(e.target.value)}>
                    <option value="">All Regulations</option>
                    {VALID_Regulations.map(r => <option key={r} value={r}>{r} Regulation</option>)}
                </select>

                <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                    <option value="">All Levels</option>
                    {VALID_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>

                <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    {VALID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <input
                    type="number"
                    placeholder="Credits"
                    value={filterCredits}
                    onChange={e => setFilterCredits(e.target.value)}
                />
            </div>

            {hasActiveFilters && (
                <div className="active-filters-bar" >
                    <div className="filters-info">
                        <span>Showing results for: </span>


                        {search && (
                            <span className="filter-chip" >
                                Search: {search}
                                <X size={14} style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                            </span>
                        )}

                        {filterRegulation && (
                            <span className="filter-chip">
                                Regulation: {filterRegulation}
                                <X size={14} style={{ cursor: 'pointer' }} onClick={() => setFilterRegulation('')} />
                            </span>
                        )}

                        {filterLevel && (
                            <span className="filter-chip" >
                                Level: {filterLevel}
                                <X size={14} style={{ cursor: 'pointer' }} onClick={() => setFilterLevel('')} />
                            </span>
                        )}

                        {filterType && (
                            <span className="filter-chip">
                                Type: {filterType}
                                <X size={14} style={{ cursor: 'pointer' }} onClick={() => setFilterType('')} />
                            </span>
                        )}

                        {filterCredits && (
                            <span className="filter-chip">
                                Credits: {filterCredits}
                                <X size={14} style={{ cursor: 'pointer' }} onClick={() => setFilterCredits('')} />
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleResetFilters}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'transparent',
                            border: 'none',
                            color: '#f99c08',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginLeft: 'auto',
                            padding: '2px 6px'
                        }}
                    >
                        <RotateCcw size={14} /> Reset Filters
                    </button>
                </div>
            )}

            <div className="table-wrapper">
                <table className="management-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Course Name</th>
                            <th>Level</th>
                            <th>Regulation</th>
                            <th>Type</th>
                            <th>Credits</th>
                            <th>Prerequisite</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCourses.map(course => (
                            <tr key={course._id}>
                                <td className="course-id-cell">{course._id}</td>
                                <td style={{ fontWeight: '500', }}>{course.courseName}</td>
                                <td>{course.courseLevel}</td>

                                {/* خلية اللائحة بتنسيق بسيط */}
                                <td>
                                    <span style={{
                                        fontSize: '12px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: '#f1f5f9',
                                        color: '#475569',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        {course.courseRegulation}
                                    </span>
                                </td>

                                <td>
                                    <span
                                        className="type-badge"
                                        style={{ backgroundColor: TYPE_COLORS[course.courseType] || "#ccc", fontSize: '11px' }}
                                    >
                                        {course.courseType}
                                    </span>
                                </td>
                                <td style={{ fontWeight: 'bold' }}>{course.courseCredits}</td>
                                <td style={{ fontSize: '12px', maxWidth: '150px' }}>
                                    {Array.isArray(course.prerequisiteCourses)
                                        ? course.prerequisiteCourses.join(', ')
                                        : course.prerequisiteCourses
                                    }
                                </td>
                                <td>
                                    <div className="action-btns">
                                        <button className="btn-icon btn-edit" onClick={() => openModal('single', course)}>
                                            <Edit size={18} />
                                        </button>
                                        <button className="btn-icon btn-delete" onClick={() => deleteCourse(course._id)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <CourseModal
                isOpen={modalType === 'single'}
                onClose={() => setModalType(null)}
                onSave={handleSaveSingle}
                initialData={editingCourse}
            />

            <CSVImportModal
                isOpen={modalType === 'csv'}
                onClose={() => setModalType(null)}
                onUploadSuccess={handleCSVUpload}
            />
        </div>
    );
};

export default ProgramCoursesManagement;