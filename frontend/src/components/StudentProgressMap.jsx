import React, { useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MarkerType
} from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';

import {
    X,
    CheckCircle2,
    PlayCircle,
    AlertCircle,
    Clock,
    Lock
} from 'lucide-react';

const STATUS_STYLES = {
    passed: { bg: '#f0fdf4', border: '#22c55e', text: '#166534', icon: <CheckCircle2 size={14} />, label: 'Completed' },
    current: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', icon: <PlayCircle size={14} />, label: 'In Progress' },
    failed: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: <AlertCircle size={14} />, label: 'Failed' },
    available: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', icon: <Clock size={14} />, label: 'Available' },
    locked: { bg: '#f8fafc', border: '#cbd5e1', text: '#64748b', icon: <Lock size={14} />, label: 'Locked', opacity: 0.6 }
};

const getLayoutedElements = (nodes, edges) => {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB', nodesep: 200, ranksep: 120 });

    nodes.forEach(n => g.setNode(n.id, { width: 220, height: 100 }));
    edges.forEach(e => g.setEdge(e.source, e.target));

    dagre.layout(g);

    return {
        nodes: nodes.map(n => {
            const pos = g.node(n.id);
            return {
                ...n,
                position: { x: pos.x - 110, y: pos.y - 50 }
            };
        }),
        edges
    };
};

const StudentProgressMapModal = ({ isOpen, onClose, allCourses = [], studentData }) => {

    const { nodes, edges } = useMemo(() => {

        if (!allCourses.length || !studentData) {
            return { nodes: [], edges: [] };
        }

        const completed = studentData.transcript.completedCourses || [];
        const semesterWorks = studentData.semesterWorks || [];

        const passed = completed
            .filter(c => c.status === "passed")
            .map(c => c.courseId?._id);

        const failed = completed
            .filter(c => c.status === "failed")
            .map(c => c.courseId?._id);

        const current = semesterWorks.map(c => c.courseId?._id);

        const nodes = [];
        const edges = [];

        allCourses.forEach(course => {

            let status = 'locked';

            if (passed.includes(course._id)) status = 'passed';
            else if (current.includes(course._id)) status = 'current';
            else if (failed.includes(course._id)) status = 'failed';
            else {
                const canTake = course.prerequisiteCourses?.every(p =>
                    passed.includes(typeof p === 'object' ? p._id : p)
                );
                status = canTake ? 'available' : 'locked';
            }

            const style = STATUS_STYLES[status]; // ✅ هنا الصح

            nodes.push({
                id: course._id,
                data: {
                    label: (
                        <div
                            className="modern-node"
                            style={{ opacity: style.opacity || 1 }}
                        >
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <span
                                    className="node-id-tag"
                                    style={{ backgroundColor: style.border }}
                                >
                                    {course._id}
                                </span>
                                <span
                                    className="node-id-tag"
                                    style={{ backgroundColor: style.border }}
                                >
                                    {course.courseType}
                                </span>
                            </div>
                            <div
                                className="node-status-badge"
                                style={{ color: style.text }}
                            >
                                {style.icon}
                                <span>{style.label}</span>
                            </div>

                            <div
                                className="node-title"
                                style={{ color: style.text }}
                            >
                                {course.courseName}
                            </div>

                            <div className="node-footer">
                                {course.courseLevel} • {course.courseCredits} Cr.
                            </div>
                        </div>
                    )
                },
                style: {
                    background: style.bg,
                    border: `2px solid ${style.border}`,
                    borderRadius: '12px',
                    width: 220,
                    padding: 0,
                    boxShadow:
                        status === 'current'
                            ? `0 0 15px ${style.border}44`
                            : '0 4px 12px rgba(0,0,0,0.05)'
                }
            });

            course.prerequisiteCourses?.forEach(p => {
                const id = typeof p === 'object' ? p._id : p;

                edges.push({
                    id: `${id}-${course._id}`,
                    source: id,
                    target: course._id,
                    type: 'smoothstep',
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: style.border,
                        width: 20,
                        height: 20
                    },
                    style: {
                        stroke: style.border,
                        strokeWidth: 2,
                        opacity: status === 'locked' ? 0.2 : 0.6
                    }
                });
            });

        });

        return getLayoutedElements(nodes, edges);

    }, [allCourses, studentData]);

    if (!isOpen) return null;

    return (
        <div className="tree-overlay">
            <div className="tree-modal">

                <div className="tree-header">
                    <h2 className="title-text">
                        Student Progress:
                        <span className="highlight">
                            {studentData?.transcript?.studentId?.studentName || 'Student'}
                        </span>
                    </h2>

                    <div className="tree-legend">
                        {Object.entries(STATUS_STYLES).map(([key, s]) => (
                            <div key={key} className="legend-chip">
                                <span
                                    className="chip-dot"
                                    style={{ backgroundColor: s.border }}
                                ></span>
                                {s.label}
                            </div>
                        ))}
                    </div>

                    <button onClick={onClose}><X /></button>
                </div>

                <div className="flow-wrapper">
                    <ReactFlow nodes={nodes} edges={edges} fitView>
                        <Background />
                        <Controls />
                    </ReactFlow>
                </div>

            </div>
        </div>
    );
};

export default StudentProgressMapModal;