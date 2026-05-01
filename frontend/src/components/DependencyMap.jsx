import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, MarkerType, ConnectionLineType } from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import { X } from 'lucide-react';
import swalService from "../services/swal";

const LEVEL_STYLES = {
    freshman: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    sophomore: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
    junior: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    senior: { bg: '#fdf2f8', border: '#ec4899', text: '#9d174d' }
};

const getLayoutedElements = (nodes, edges) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 250, ranksep: 150 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 220, height: 100 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    return {
        nodes: nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            return {
                ...node,
                position: { x: nodeWithPosition.x - 110, y: nodeWithPosition.y - 50 },
            };
        }),
        edges,
    };
};

const DependencyMap = ({ courses, onClose }) => {
    const { nodes: finalNodes, edges: finalEdges } = useMemo(() => {
        const initialNodes = [];
        const initialEdges = [];

        courses.forEach((course) => {
            const style = LEVEL_STYLES[course.courseLevel?.toLowerCase()] || { bg: '#fff', border: '#cbd5e1', text: 'var( --primary-blue-color)' };

            initialNodes.push({
                id: course._id,
                data: {
                    label: (
                        <div className="modern-node">
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
                            <div className="node-title" style={{ color: style.text }}>{course.courseName}</div>
                            <div className="node-footer">{course.courseLevel} • {course.courseCredits} Cr.</div>
                        </div>
                    )
                },
                style: {
                    background: style.bg,
                    borderRadius: '12px',
                    border: `2px solid ${style.border}`,
                    width: 220,
                    padding: 0,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                },
            });

            if (course.prerequisiteCourses) {
                const prereqs = Array.isArray(course.prerequisiteCourses) ? course.prerequisiteCourses : [course.prerequisiteCourses];

                prereqs.forEach((prereqId) => {
                    if (prereqId && prereqId.trim() !== "") {
                        initialEdges.push({
                            id: `e-${prereqId}-${course._id}`,
                            source: prereqId,
                            target: course._id,
                            type: 'smoothstep',
                            pathOptions: { borderRadius: 30 },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: style.border,
                                width: 20,
                                height: 20
                            },
                            style: { stroke: style.border, strokeWidth: 2.5, opacity: 0.5 },
                        });
                    }
                });
            }
        });

        return getLayoutedElements(initialNodes, initialEdges);
    }, [courses]);

    return (
        <div className="tree-overlay">
            <div className="tree-modal">
                <div className="tree-header">
                    <div className="header-info">
                        <h2 className="title-text">Curriculum Dependency Map</h2>
                        <div className="tree-legend">
                            {Object.entries(LEVEL_STYLES).map(([level, s]) => (
                                <div key={level} className="legend-chip">
                                    <span className="chip-dot" style={{ backgroundColor: s.border }}></span>
                                    {level}
                                </div>
                            ))}
                        </div>
                    </div>
                    <button className="close-x-btn" onClick={onClose}><X size={28} /></button>
                </div>

                <div className="flow-wrapper">
                    <ReactFlow
                        nodes={finalNodes}
                        edges={finalEdges}
                        fitView
                        connectionLineType={ConnectionLineType.SmoothStep}
                    >
                        <Background color="#f1f5f9" variant="lines" gap={40} size={1} />
                        <Controls />
                    </ReactFlow>
                </div>
            </div>
        </div>
    );
};

export default DependencyMap;