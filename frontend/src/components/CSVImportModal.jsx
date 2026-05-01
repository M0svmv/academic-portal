import React, { useState, useEffect } from 'react';
import { X, Upload, Download, AlertCircle } from 'lucide-react';
import '../pages/styles/ProgramCourses.css';
import api from '../services/api'
import swalService from "../services/swal";

const VALID_TYPES = [
    "Core", "Program Elective",
    "General Elective 1", "General Elective 2", "General Elective 3",
    "Engineering Economy Elective", "Project Management Elective",
    "Engineering Physics Elective", "Engineering Mathematics Elective",
    "graduation-project",
    "training",
];

const VALID_LEVELS = ["freshman", "sophomore", "junior", "senior-1", "senior-2", "senior"];

const TYPE_MAP = {
    elective1: "General Elective 1",
    elective2: "General Elective 2",
    elective3: "General Elective 3"
};

const COURSE_REGULATION = ["New", "Last"];

const CSVImportModal = ({ isOpen, onClose, onUploadSuccess }) => {
    const [data, setData] = useState([]);
    const [errors, setErrors] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [editPrereq, setEditPrereq] = useState({});

    useEffect(() => {
        if (!isOpen) {
            setData([]);
            setErrors([]);
            setEditPrereq({});
        }
        fetchCourses();
    }, [isOpen]);

    const fetchCourses = async () => {
        try {
            const res = await api.get("/courses");
            setAllCourses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    if (!isOpen) return null;

    const downloadTemplate = () => {
        const csv = `"_id","courseName","courseCredits","courseType","courseLevel","courseRegulation","prerequisiteCourses"
"CS101","Intro to CS",3,Core,freshman,New,
"CS102","Data Structures",3,Core,sophomore,New,"CS101"`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'courses_template.csv';
        a.click();
    };

    const parseCSV = (text) => {
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
        if (lines.length < 2) return [];

        const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map(h => h.replace(/"/g, '').trim());

        return lines.slice(1).map(line => {
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
                .map(v => v.replace(/"/g, '').trim());
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = values[i] || "";
            });
            return obj;
        });
    };

    const validateData = (rows) => {
        const foundErrors = [];
        const fileIds = rows.map(r => r._id);
        const backendIds = allCourses.map(c => c._id);
        const allIds = [...new Set([...fileIds, ...backendIds])];
        const duplicates = fileIds.filter((id, i) => fileIds.indexOf(id) !== i);

        const validated = rows.map((row, idx) => {
            const rowErrors = {};

            if (!row._id) rowErrors._id = "Missing ID";
            if (!row.courseName) rowErrors.courseName = "Missing Name";

            if (!row.courseCredits || isNaN(row.courseCredits)) {
                rowErrors.courseCredits = "Must be number";
                row.courseCredits = 3;
            }

            if (duplicates.includes(row._id)) {
                rowErrors._id = "Duplicate ID";
            }

            if (!VALID_TYPES.includes(row.courseType)) {
                if (TYPE_MAP[row.courseType]) {
                    row.courseType = TYPE_MAP[row.courseType];
                    rowErrors.courseType = "Auto-corrected";
                } else {
                    rowErrors.courseType = "Invalid Type";
                }
            }

            if (!VALID_LEVELS.includes(row.courseLevel)) {
                rowErrors.courseLevel = "Invalid Level";
            }

            if (!COURSE_REGULATION.includes(row.courseRegulation)) {
                rowErrors.courseRegulation = "Invalid Regulation";
            }

            const prereqsRaw = row.prerequisiteCourses || [];
            const prereqs = Array.isArray(prereqsRaw)
                ? prereqsRaw.map(s => s.trim()).filter(p => p !== "")
                : prereqsRaw.split(/[,|]/).map(s => s.trim()).filter(p => p !== "");

            const invalid = prereqs.filter(p => !allIds.includes(p));
            if (prereqs.includes(row._id)) {
                rowErrors.prerequisiteCourses = "Cannot depend on itself";
            } else if (invalid.length > 0) {
                rowErrors.prerequisiteCourses = "Invalid prerequisites: " + invalid.join(", ");
            }

            row.prerequisiteCourses = [...new Set(prereqs)];

            if (Object.keys(rowErrors).length > 0) {
                foundErrors.push({
                    line: idx + 2,
                    fields: rowErrors
                });
            }

            return {
                ...row,
                courseCredits: Number(row.courseCredits),
                prerequisiteCourses: row.prerequisiteCourses
            };
        });

        setData(validated);
        setErrors(foundErrors);
    };

    const hasErrors = errors.length > 0;

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setData([]);
        setErrors([]);
        setEditPrereq({});

        const reader = new FileReader();
        reader.onload = (ev) => {
            const parsed = parseCSV(ev.target.result);
            validateData(parsed);
        };
        reader.readAsText(file);
    };

    const handleEdit = (rowIndex, field, value) => {
        const updated = [...data];
        if (field === "prerequisiteCourses") {
            setEditPrereq(prev => ({ ...prev, [rowIndex]: value }));
        } else {
            updated[rowIndex][field] = value;
            validateData(updated);
        }
    };

    const getError = (rowIndex, field) => {
        const err = errors.find(e => e.line === rowIndex + 2);
        return err?.fields?.[field];
    };

    const handleSubmit = async () => {
        if (!hasErrors && data.length > 0) {

            try {
                console.log(JSON.stringify(data, null, 2));
                await api.post("/courses/list", data);
                swalService.success("Courses imported successfully");
                onClose();
            } catch (err) {
                swalService.error(err.message || "Upload failed");
            }
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card wide">
                <div className="modal-head">
                    <h3>Import Courses</h3>
                    <X onClick={onClose} style={{ cursor: 'pointer' }} />
                </div>

                <div className="modal-body">
                    <div className="template-alert">
                        <span>Use correct format</span>
                        <button className="btn-main" onClick={downloadTemplate}>
                            <Download size={14} /> Template
                        </button>
                    </div>

                    <div className="drop-zone">
                        <input type="file" accept=".csv" onChange={handleFile} />
                        <Upload size={20} />
                        <p>Upload CSV</p>
                    </div>

                    {data.length > 0 && (
                        <div className="preview-table-wrapper">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Credits</th>
                                        <th>Type</th>
                                        <th>Level</th>
                                        <th>Regulation</th>
                                        <th>Prerequisites</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row, i) => (
                                        <tr key={i}>
                                            {["_id", "courseName", "courseCredits"].map(field => (
                                                <td key={field} className={getError(i, field) ? "cell-error" : ""}>
                                                    <input
                                                        value={row[field]}
                                                        onChange={(e) => handleEdit(i, field, e.target.value)}
                                                        className="cell-input"
                                                    />
                                                </td>
                                            ))}

                                            <td className={getError(i, "courseType") ? (getError(i, "courseType") === "Auto-corrected" ? "cell-warning" : "cell-error") : ""}>
                                                <select
                                                    value={row.courseType}
                                                    onChange={(e) => handleEdit(i, "courseType", e.target.value)}
                                                >
                                                    {VALID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </td>

                                            <td className={getError(i, "courseLevel") ? "cell-error" : ""}>
                                                <select
                                                    value={row.courseLevel}
                                                    onChange={(e) => handleEdit(i, "courseLevel", e.target.value)}
                                                >
                                                    {VALID_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                                </select>
                                            </td>

                                            <td className={getError(i, "courseRegulation") ? "cell-error" : ""}>
                                                <select
                                                    value={row.courseRegulation}
                                                    onChange={(e) => handleEdit(i, "courseRegulation", e.target.value)}
                                                >
                                                    <option value="">Select</option>
                                                    {COURSE_REGULATION.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </td>

                                            <td className={getError(i, "prerequisiteCourses") ? "cell-error" : ""}>
                                                <div className="prereq-container">
                                                    {row.prerequisiteCourses.length > 0 ? (
                                                        row.prerequisiteCourses.map((p, idx) => (
                                                            <span key={idx} className="prereq-badge">{p}</span>
                                                        ))
                                                    ) : (
                                                        <span className="prereq-badge empty">—</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Add / edit IDs"
                                                    value={editPrereq[i] ?? row.prerequisiteCourses.join(", ")}
                                                    onChange={(e) => handleEdit(i, "prerequisiteCourses", e.target.value)}
                                                    onBlur={() => {
                                                        const value = editPrereq[i] || "";
                                                        const updated = [...data];
                                                        updated[i].prerequisiteCourses = value.split(/[,|]/)
                                                            .map(s => s.trim())
                                                            .filter(p => p !== "");
                                                        validateData(updated);
                                                        setEditPrereq(prev => ({ ...prev, [i]: undefined }));
                                                    }}
                                                    className="cell-input prereq-input"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {hasErrors && (
                        <div className="error-list">
                            <AlertCircle size={14} />
                            <span>Fix highlighted errors before import</span>
                        </div>
                    )}

                    <button
                        disabled={hasErrors || data.length === 0}
                        className="btn-submit"
                        onClick={handleSubmit}
                    >
                        Import {data.length} Courses
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CSVImportModal;