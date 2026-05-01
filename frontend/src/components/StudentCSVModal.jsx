import React, { useState, useEffect } from 'react';
import { X, Upload, Download } from 'lucide-react';
import api from '../services/api';

const StudentCSVModal = ({ isOpen, onClose, onUploadSuccess }) => {
    const [data, setData] = useState([]);
    const [errors, setErrors] = useState([]);
    const [existingStudents, setExistingStudents] = useState([]);

    useEffect(() => {
        if (!isOpen) {
            setData([]);
            setErrors([]);
        } else {
            fetchExistingStudents();
        }
    }, [isOpen]);

    const fetchExistingStudents = async () => {
        try {
            const res = await api.get('/students');
            setExistingStudents(res.data);
        } catch (err) { console.error('Failed to fetch students:', err); }
    };

    const downloadTemplate = () => {
        const csv = `"academicId","studentName","username","studentPhone","studentEmail","password"
"224001","Youssef Ahmed","youssef.22","01123456789","youssef@edu.com","pass123"`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students_template.csv';
        a.click();
    };

    const validateData = (rows) => {
        const foundErrors = [];
        const fileIds = rows.map(r => r.academicId);
        const duplicatesInFile = fileIds.filter((id, i) => fileIds.indexOf(id) !== i);

        const validated = rows.map((row, idx) => {
            const rowErrors = {};

            if (!row.academicId) rowErrors.academicId = "Missing ID";
            if (!row.studentName) rowErrors.studentName = "Missing Name";
            if (!row.username) rowErrors.username = "Missing Username";
            if (!row.studentPhone) rowErrors.studentPhone = "Missing Phone";
            if (!row.studentEmail) rowErrors.studentEmail = "Missing Email";
            if (!row.password) rowErrors.password = "Missing Password";

            // Uniqueness checks
            if (duplicatesInFile.includes(row.academicId)) rowErrors.academicId = "Duplicate in file";
            if (existingStudents.some(s => s._id === row.academicId)) rowErrors.academicId = "Already exists";

            if (Object.keys(rowErrors).length) foundErrors.push({ line: idx + 2, fields: rowErrors });
            return row;
        });

        setData(validated);
        setErrors(foundErrors);
    };

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const lines = ev.target.result.split(/\r?\n/).filter(l => l.trim() !== "");
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
            const parsed = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.replace(/"/g, '').trim());
                const obj = {};
                headers.forEach((h, i) => obj[h] = values[i] || "");
                return obj;
            });
            validateData(parsed);
        };
        reader.readAsText(file);
    };

    if (!isOpen) return null;

    const hasError = (rowIndex, field) => {
        const errorObj = errors.find(e => e.line === rowIndex + 2);
        return errorObj && errorObj.fields[field];
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card wide">
                <div className="modal-head">
                    <h3>Import Students via CSV</h3>
                    <X onClick={onClose} style={{ cursor: 'pointer' }} />
                </div>
                <div className="modal-body">
                    <div className="template-alert">
                        <span>Use correct format</span>
                        <button className="btn-main" onClick={downloadTemplate}><Download size={14} /> Template</button>
                    </div>

                    <div className="drop-zone">
                        <input type="file" accept=".csv" onChange={handleFile} />
                        <Upload size={20} />
                        <p>Click or drag student CSV file here</p>
                    </div>

                    {data.length > 0 && (
                        <div className="preview-table-wrapper">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        <th>Academic ID</th>
                                        <th>Name</th>
                                        <th>Username</th>
                                        <th>Phone</th>
                                        <th>Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row, i) => (
                                        <tr key={i}>
                                            <td className={hasError(i, 'academicId') ? "cell-error" : ""}>{row.academicId}</td>
                                            <td className={hasError(i, 'studentName') ? "cell-error" : ""}>{row.studentName}</td>
                                            <td className={hasError(i, 'username') ? "cell-error" : ""}>{row.username}</td>
                                            <td className={hasError(i, 'studentPhone') ? "cell-error" : ""}>{row.studentPhone}</td>
                                            <td className={hasError(i, 'studentEmail') ? "cell-error" : ""}>{row.studentEmail}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <button disabled={errors.length > 0 || data.length === 0}
                        className="btn-submit"
                        onClick={() => onUploadSuccess(data)}>
                        Import {data.length} Students
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentCSVModal;