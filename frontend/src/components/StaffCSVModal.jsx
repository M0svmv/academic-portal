import React, { useState, useEffect } from 'react';
import { X, Upload, Download, AlertCircle } from 'lucide-react';
import api from '../services/api';
import '../pages/styles/ProgramCourses.css';

const VALID_ROLES = ['coordinator', 'lecturer', 'ta', 'admin', 'academic-advisor'];

const StaffCSVModal = ({ isOpen, onClose, onUploadSuccess }) => {
    const [data, setData] = useState([]);
    const [errors, setErrors] = useState([]);
    const [editRoles, setEditRoles] = useState({});
    const [existingStaff, setExistingStaff] = useState([]);

    useEffect(() => {
        if (!isOpen) {
            setData([]);
            setErrors([]);
            setEditRoles({});
        } else {
            fetchExistingStaff();
        }
    }, [isOpen]);

    const fetchExistingStaff = async () => {
        try {
            const res = await api.get('/staff');
            setExistingStaff(res.data);
        } catch (err) {
            console.error('Failed to fetch staff:', err);
        }
    };

    if (!isOpen) return null;

    const downloadTemplate = () => {
        const csv = `"_id","staffName","username","email","phone","password","roles"
"ST001","Ahmed Ali","ahmed.ali","ahmed@uni.edu","0100123456","12345678","lecturer|admin"`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'staff_template.csv';
        a.click();
    };

    const parseCSV = (text) => {
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
        if (lines.length < 2) return [];
        const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/"/g, '').trim());
        return lines.slice(1).map(line => {
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/"/g, '').trim());
            const obj = {};
            headers.forEach((h, i) => obj[h] = values[i] || "");
            return obj;
        });
    };

    const validateData = (rows) => {
        const foundErrors = [];

        const fileIds = rows.map(r => r._id);
        const duplicatesInFile = fileIds.filter((id, i) => fileIds.indexOf(id) !== i);

        const usernamesInFile = rows.map(r => r.username);
        const duplicateUsernames = usernamesInFile.filter((u, i) => usernamesInFile.indexOf(u) !== i);

        const emailsInFile = rows.map(r => r.email);
        const duplicateEmails = emailsInFile.filter((e, i) => emailsInFile.indexOf(e) !== i);

        const phonesInFile = rows.map(r => r.phone);
        const duplicatePhones = phonesInFile.filter((p, i) => phonesInFile.indexOf(p) !== i);

        const validated = rows.map((row, idx) => {
            const rowErrors = {};

            // ✅ Basic required fields
            if (!row._id) rowErrors._id = "Missing ID";
            if (!row.staffName) rowErrors.staffName = "Missing Name";
            if (!row.username) rowErrors.username = "Missing Username";
            if (!row.email) rowErrors.email = "Missing Email";
            if (!row.phone) rowErrors.phone = "Missing Phone";
            if (!row.password) rowErrors.password = "Missing Password";

            // ✅ Validate uniqueness in file
            if (duplicatesInFile.includes(row._id)) rowErrors._id = "Duplicate ID in file";
            if (duplicateUsernames.includes(row.username)) rowErrors.username = "Duplicate username in file";
            if (duplicateEmails.includes(row.email)) rowErrors.email = "Duplicate email in file";
            if (duplicatePhones.includes(row.phone)) rowErrors.phone = "Duplicate phone in file";

            // ✅ Validate against existing backend
            if (existingStaff.some(s => s._id === row._id)) rowErrors._id = "ID already exists";
            if (existingStaff.some(s => s.username === row.username)) rowErrors.username = "Username already exists";
            if (existingStaff.some(s => s.email === row.email)) rowErrors.email = "Email already exists";
            if (existingStaff.some(s => s.phone === row.phone)) rowErrors.phone = "Phone already exists";

            // ✅ Validate phone format (example: Egypt)
            if (row.phone && !/^01[0-9]{8,9}$/.test(row.phone)) rowErrors.phone = "Invalid phone format";

            // ✅ Roles validation
            const rolesRaw = row.roles || "";
            const roles = Array.isArray(rolesRaw) ? rolesRaw : rolesRaw.split(/[,|]/).map(r => r.trim()).filter(r => r !== "");
            const invalidRoles = roles.filter(r => !VALID_ROLES.includes(r));
            if (!roles.length) rowErrors.roles = "At least one role required";
            else if (invalidRoles.length) rowErrors.roles = "Invalid roles: " + invalidRoles.join(", ");
            row.roles = [...new Set(roles)];

            if (Object.keys(rowErrors).length) {
                foundErrors.push({ line: idx + 2, fields: rowErrors });
            }

            return row;
        });

        setData(validated);
        setErrors(foundErrors);
    };

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setData([]);
        setErrors([]);
        setEditRoles({});
        const reader = new FileReader();
        reader.onload = (ev) => {
            const parsed = parseCSV(ev.target.result);
            validateData(parsed);
        };
        reader.readAsText(file);
    };

    const handleEdit = (rowIndex, field, value) => {
        const updated = [...data];
        if (field === "roles") {
            setEditRoles(prev => ({ ...prev, [rowIndex]: value }));
        } else {
            updated[rowIndex][field] = value;
            validateData(updated);
        }
    };

    const getError = (rowIndex, field) => {
        const err = errors.find(e => e.line === rowIndex + 2);
        return err?.fields?.[field];
    };

    const handleSubmit = () => {
        if (errors.length === 0 && data.length > 0) {
            onUploadSuccess(data);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card wide">
                <div className="modal-head">
                    <h3>Import Staff</h3>
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
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Password</th>
                                        <th>Roles</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row, i) => (
                                        <tr key={i}>
                                            {["_id", "staffName", "username", "email", "phone", "password"].map(f => (
                                                <td key={f} className={getError(i, f) ? "cell-error" : ""}>
                                                    <input
                                                        value={row[f]}
                                                        onChange={e => handleEdit(i, f, e.target.value)}
                                                        className="cell-input"
                                                    />
                                                    {getError(i, f) && <div className="error-text">{getError(i, f)}</div>}
                                                </td>
                                            ))}
                                            <td className={getError(i, "roles") ? "cell-error" : ""}>
                                                {row.roles.map((r, idx) => <span key={idx} className="prereq-badge">{r}</span>)}
                                                <input
                                                    type="text"
                                                    placeholder="Add / edit roles"
                                                    value={editRoles[i] ?? row.roles.join(", ")}
                                                    onChange={e => handleEdit(i, "roles", e.target.value)}
                                                    onBlur={() => {
                                                        const value = editRoles[i] || "";
                                                        const updated = [...data];
                                                        updated[i].roles = value.split(/[,|]/).map(r => r.trim()).filter(r => r !== "");
                                                        validateData(updated);
                                                        setEditRoles(prev => ({ ...prev, [i]: undefined }));
                                                    }}
                                                    className="cell-input prereq-input"
                                                />
                                                {getError(i, "roles") && <div className="error-text">{getError(i, "roles")}</div>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {errors.length > 0 && (
                        <div className="error-list">
                            <AlertCircle size={14} /> Fix errors before import
                        </div>
                    )}

                    <button
                        disabled={errors.length > 0}
                        className="btn-submit"
                        onClick={handleSubmit}
                    >
                        Import Data
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StaffCSVModal;