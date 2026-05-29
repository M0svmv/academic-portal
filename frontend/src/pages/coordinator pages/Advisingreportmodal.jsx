import React, { useRef, useEffect, useState } from "react";
import { X, Printer, FileDown } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

const AdvisingReportModal = ({ onClose, advisors, allLists, unassignedStudents, nonAdvisors, stats }) => {
    const printRef = useRef(null);
    const [chartsReady, setChartsReady] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setChartsReady(true), 600);
        return () => clearTimeout(timer);
    }, []);

    const reportDate = new Date().toLocaleString("en-US", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit"
    });

    const advisorLoadData = allLists
        .filter(l => l.advisor?.staffName)
        .map(l => ({
            name: l.advisor.staffName.length > 15
                ? l.advisor.staffName.slice(0, 15) + "..."
                : l.advisor.staffName,
            fullName: l.advisor.staffName,
            students: l.studentsCount || 0,
            listId: l._id,
        }))
        .sort((a, b) => b.students - a.students);

    const capacityGroups = { Low: 0, Normal: 0, High: 0 };
    allLists.forEach(l => {
        const count = l.studentsCount || 0;
        if (count === 0) return;
        if (count < 10) capacityGroups["Low"]++;
        else if (count <= 25) capacityGroups["Normal"]++;
        else capacityGroups["High"]++;
    });
    const pieData = Object.entries(capacityGroups)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }));

    const hasAdvisor = allLists.filter(l => l.advisor).length;
    const noAdvisor = allLists.filter(l => !l.advisor).length;
    const statusPieData = [
        { name: "Assigned", value: hasAdvisor },
        { name: "Unassigned", value: noAdvisor },
    ].filter(d => d.value > 0);

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;
        const printWindow = window.open("", "_blank", "width=900,height=700");
        printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Academic Advising Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #fff;
      color: #1e293b;
      font-size: 13px;
      line-height: 1.6;
    }
    .page { padding: 32px 40px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
    thead tr { background: #1e293b; color: #fff; }
    thead th { padding: 10px 14px; text-align: left; font-weight: 600; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td { padding: 9px 14px; border-bottom: 1px solid #e2e8f0; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      thead tr { background: #1e293b !important; color: #fff !important; }
    }
  </style>
</head>
<body>
  ${printContent.innerHTML}
</body>
</html>`);
        printWindow.document.close();
        setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
    };

    const SectionTitle = ({ children, color = "#3b82f6" }) => (
        <div style={{
            fontSize: '15px', fontWeight: '700', color: '#1e293b',
            borderLeft: `4px solid ${color}`, paddingLeft: '12px',
            marginBottom: '16px', marginTop: '28px'
        }}>
            {children}
        </div>
    );

    const Badge = ({ children, bg, color }) => (
        <span style={{
            display: 'inline-block', padding: '3px 10px',
            borderRadius: '20px', fontSize: '11px', fontWeight: '700',
            background: bg, color
        }}>{children}</span>
    );

    const getCapacity = (count) => {
        if (count === 0) return { label: 'Empty', bg: '#f1f5f9', color: '#64748b' };
        if (count < 10) return { label: 'Low', bg: '#eff6ff', color: '#1d4ed8' };
        if (count <= 25) return { label: 'Normal', bg: '#f0fdf4', color: '#16a34a' };
        return { label: 'High', bg: '#fff7ed', color: '#c2410c' };
    };

    const CustomBarTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        const item = advisorLoadData.find(d => d.name === label);
        return (
            <div style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                padding: '8px 12px', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                <p style={{ fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>{item?.fullName || label}</p>
                <p style={{ color: '#3b82f6' }}>Students: <strong>{payload[0].value}</strong></p>
            </div>
        );
    };

    const CustomPieTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{
                background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: '8px', padding: '8px 12px', fontSize: '13px'
            }}>
                <p style={{ fontWeight: '700' }}>{payload[0].name}</p>
                <p style={{ color: '#3b82f6' }}>Count: <strong>{payload[0].value}</strong></p>
            </div>
        );
    };

    const thStyle = { padding: '10px 14px', textAlign: 'left', fontWeight: '600' };
    const tdStyle = (i) => ({ padding: '9px 14px', background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' });

    return (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div style={{
                background: '#fff', borderRadius: '16px',
                width: '92vw', maxWidth: '1100px', maxHeight: '90vh',
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 60px rgba(0,0,0,0.2)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 28px', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#1e293b', borderRadius: '16px 16px 0 0',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FileDown size={22} color="#fff" />
                        <div>
                            <h3 style={{ color: '#fff', margin: 0, fontSize: '18px', fontWeight: '700' }}>
                                Academic Advising Report
                            </h3>
                            <p style={{ color: '#94a3b8', margin: 0, fontSize: '13px' }}>
                                Detailed advising status report
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                            onClick={handlePrint}
                            disabled={!chartsReady}
                            className="btn-2"
                        >
                            <Printer size={16} />
                            {chartsReady ? "Print / PDF" : "Preparing..."}
                        </button>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.1)', border: 'none',
                            borderRadius: '8px', padding: '8px', cursor: 'pointer',
                            color: '#fff', display: 'flex', alignItems: 'center'
                        }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Report Body */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    <div ref={printRef} style={{
                        padding: '36px 40px',
                        fontFamily: "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif",
                        color: '#1e293b', fontSize: '13px', lineHeight: '1.6'
                    }}>

                        {/* Report Header */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                            borderBottom: '3px solid #1e293b', paddingBottom: '20px', marginBottom: '30px'
                        }}>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b' }}>
                                    Academic Advising Report
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                    Comprehensive overview of advising lists, advisors, and student assignments
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{reportDate}</div>
                                <div style={{ marginTop: '2px' }}>Report Generated</div>
                            </div>
                        </div>

                        {/* Stats Overview */}
                        <SectionTitle color="#3b82f6">Summary Overview</SectionTitle>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '32px' }}>
                            {[
                                { label: 'Total Advisors', value: stats.totalAdvisors, color: '#3b82f6', bg: '#eff6ff' },
                                { label: 'Unassigned Students', value: stats.unassignedStudents, color: '#f97316', bg: '#fff7ed' },
                                { label: 'Empty Lists', value: stats.emptyLists, color: '#ef4444', bg: '#fef2f2' },
                                { label: 'Total Lists', value: allLists.length, color: '#10b981', bg: '#f0fdf4' },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: s.bg, border: `1px solid ${s.color}30`,
                                    borderRadius: '10px', padding: '18px 16px', textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>{s.label}</div>
                                    <div style={{ fontSize: '32px', fontWeight: '800', color: s.color }}>{s.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Charts */}
                        <SectionTitle color="#3b82f6">Analytics</SectionTitle>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>

                            {/* Bar Chart */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '14px' }}>
                                    Student Distribution per Advisor
                                </div>
                                {advisorLoadData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={advisorLoadData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'Cairo' }}
                                                angle={-30}
                                                textAnchor="end"
                                                interval={0}
                                            />
                                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                                            <Tooltip content={<CustomBarTooltip />} />
                                            <Bar dataKey="students" name="Students" radius={[4, 4, 0, 0]}>
                                                {advisorLoadData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                        No data available
                                    </div>
                                )}
                            </div>

                            {/* Pie Charts */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', flex: 1 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                                        List Capacity Distribution
                                    </div>
                                    {pieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={130}>
                                            <PieChart>
                                                <Pie data={pieData} cx="50%" cy="50%" outerRadius={50} dataKey="value"
                                                    label={({ name, value }) => `${name}: ${value}`}
                                                    labelLine={false}
                                                    style={{ fontSize: '11px', fontFamily: 'Cairo' }}>
                                                    {pieData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomPieTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                            No active lists
                                        </div>
                                    )}
                                </div>

                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', flex: 1 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                                        List Assignment Status
                                    </div>
                                    {statusPieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={130}>
                                            <PieChart>
                                                <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={50} dataKey="value"
                                                    label={({ name, value }) => `${name}: ${value}`}
                                                    labelLine={false}
                                                    style={{ fontSize: '11px', fontFamily: 'Cairo' }}>
                                                    <Cell fill="#3b82f6" />
                                                    <Cell fill="#ef4444" />
                                                </Pie>
                                                <Tooltip content={<CustomPieTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                            No data
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Advisors Table */}
                        <SectionTitle color="#10b981">Academic Advisors ({advisors.length})</SectionTitle>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: '#1e293b', color: '#fff' }}>
                                    {["ID", "Name", "Email", "Phone", "Students"].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {advisors.length > 0 ? advisors.map((adv, i) => {
                                    const list = allLists.find(l => l.advisor?._id === adv._id);
                                    const count = list?.studentsCount || 0;
                                    const cap = getCapacity(count);
                                    return (
                                        <tr key={adv._id}>
                                            <td style={{ ...tdStyle(i), fontFamily: 'monospace', color: '#64748b', fontSize: '11px' }}>{adv._id}</td>
                                            <td style={{ ...tdStyle(i), fontWeight: '600', color: '#1d4ed8' }}>{adv.staffName}</td>
                                            <td style={{ ...tdStyle(i), color: '#475569' }}>{adv.email}</td>
                                            <td style={{ ...tdStyle(i), color: '#475569' }}>{adv.phone || "—"}</td>
                                            <td style={tdStyle(i)}>
                                                <Badge bg={cap.bg} color={cap.color}>{count} students</Badge>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No advisors found.</td></tr>
                                )}
                            </tbody>
                        </table>

                        {/* All Lists Table */}
                        <SectionTitle color="#8b5cf6">Advising Lists ({allLists.length})</SectionTitle>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: '#1e293b', color: '#fff' }}>
                                    {["List ID", "Assigned Advisor", "Students", "Load Level", "Status"].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {allLists.length > 0 ? allLists.map((list, i) => {
                                    const count = list.studentsCount || 0;
                                    const cap = getCapacity(count);
                                    return (
                                        <tr key={list._id}>
                                            <td style={{ ...tdStyle(i), fontFamily: 'monospace', color: '#64748b', fontSize: '11px' }}>{list._id}</td>
                                            <td style={{ ...tdStyle(i), fontWeight: '600', color: list.advisor ? '#1d4ed8' : '#94a3b8' }}>
                                                {list.advisor?.staffName || "Unassigned"}
                                            </td>
                                            <td style={{ ...tdStyle(i), fontWeight: '700' }}>{count}</td>
                                            <td style={tdStyle(i)}><Badge bg={cap.bg} color={cap.color}>{cap.label}</Badge></td>
                                            <td style={tdStyle(i)}>
                                                <Badge
                                                    bg={list.advisor ? '#f0fdf4' : '#fef2f2'}
                                                    color={list.advisor ? '#16a34a' : '#ef4444'}
                                                >
                                                    {list.advisor ? '✓ Complete' : '✗ No Advisor'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No lists found.</td></tr>
                                )}
                            </tbody>
                        </table>

                        {/* Unassigned Students */}
                        {unassignedStudents.length > 0 && (
                            <>
                                <SectionTitle color="#f97316">Unassigned Students ({unassignedStudents.length})</SectionTitle>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ background: '#1e293b', color: '#fff' }}>
                                            {["Student ID", "Name", "Email", "Level", "Regulation", "GPA"].map(h => (
                                                <th key={h} style={thStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {unassignedStudents.map((s, i) => (
                                            <tr key={s._id} style={{ background: i % 2 === 0 ? '#fff' : '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
                                                <td style={{ padding: '9px 14px', fontFamily: 'monospace', color: '#64748b', fontSize: '11px' }}>
                                                    {s.studentId?._id || s._id}
                                                </td>
                                                <td style={{ padding: '9px 14px', fontWeight: '600', color: '#c2410c' }}>
                                                    {s.studentId?.studentName || "—"}
                                                </td>
                                                <td style={{ padding: '9px 14px', color: '#475569' }}>
                                                    {s.studentId?.studentEmail || "—"}
                                                </td>
                                                <td style={{ padding: '9px 14px' }}>
                                                    <Badge bg="#f1f5f9" color="#475569">{s.level || "—"}</Badge>
                                                </td>
                                                <td style={{ padding: '9px 14px' }}>
                                                    <Badge bg="#eff6ff" color="#1d4ed8">{s.regulation || "—"}</Badge>
                                                </td>
                                                <td style={{ padding: '9px 14px', fontWeight: '700' }}>{s.GPA ?? "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}

                        {/* Available Staff */}
                        {nonAdvisors.length > 0 && (
                            <>
                                <SectionTitle color="#64748b">Staff Available for Promotion ({nonAdvisors.length})</SectionTitle>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ background: '#1e293b', color: '#fff' }}>
                                            {["Staff ID", "Name", "Email"].map(h => (
                                                <th key={h} style={thStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nonAdvisors.map((staff, i) => (
                                            <tr key={staff._id}>
                                                <td style={{ ...tdStyle(i), fontFamily: 'monospace', color: '#64748b', fontSize: '11px' }}>{staff._id}</td>
                                                <td style={{ ...tdStyle(i), fontWeight: '600' }}>{staff.staffName}</td>
                                                <td style={{ ...tdStyle(i), color: '#475569' }}>{staff.email}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}

                        {/* Recommendations */}
                        <div style={{
                            background: '#fffbeb', border: '1px solid #fde68a',
                            borderRadius: '10px', padding: '18px 22px', marginTop: '10px'
                        }}>
                            <div style={{ color: '#92400e', fontWeight: '700', fontSize: '14px', marginBottom: '10px' }}>
                                Recommendations
                            </div>
                            <div style={{ color: '#78350f', fontSize: '12px', lineHeight: '2' }}>
                                {stats.emptyLists > 0 && (
                                    <p>• There {stats.emptyLists === 1 ? 'is' : 'are'} <strong>{stats.emptyLists}</strong> empty advising list{stats.emptyLists > 1 ? 's' : ''} with no students assigned. Consider assigning students promptly.</p>
                                )}
                                {stats.unassignedStudents > 0 && (
                                    <p>• <strong>{stats.unassignedStudents}</strong> student{stats.unassignedStudents > 1 ? 's are' : ' is'} not assigned to any advising list. This should be resolved as soon as possible.</p>
                                )}
                                {stats.staffAvailable > 0 && (
                                    <p>• <strong>{stats.staffAvailable}</strong> staff member{stats.staffAvailable > 1 ? 's are' : ' is'} available and eligible to be promoted to academic advisors to help balance the load.</p>
                                )}
                                {advisorLoadData.filter(a => a.students > 25).length > 0 && (
                                    <p>• <strong>{advisorLoadData.filter(a => a.students > 25).length}</strong> advisor{advisorLoadData.filter(a => a.students > 25).length > 1 ? 's have' : ' has'} a high load (more than 25 students). Student redistribution is recommended.</p>
                                )}
                                {stats.emptyLists === 0 && stats.unassignedStudents === 0 && (
                                    <p>• The advising system is in good standing. All lists have students and all students are assigned.</p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            marginTop: '36px', borderTop: '1px solid #e2e8f0',
                            paddingTop: '14px', display: 'flex',
                            justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8'
                        }}>
                            <span>Academic Advising Report — Student Management System</span>
                            <span>{reportDate}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvisingReportModal;