import React, { useMemo, useState, useEffect } from 'react';
import { ReactFlow, Background, Controls, MarkerType, ConnectionLineType } from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import { X, MonitorOff } from 'lucide-react';


const LEVEL_STYLES = {
    freshman: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    sophomore: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
    junior: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    senior: { bg: '#fdf2f8', border: '#ec4899', text: '#9d174d' },
    'senior-1': { bg: '#fdf2f8', border: '#ec4899', text: '#9d174d' },
    'senior-2': { bg: '#fff1f2', border: '#f43f5e', text: '#9f1239' }
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

    const [selectedRegulation, setSelectedRegulation] = useState('New');
    const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => {
            setIsSmallScreen(window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { nodes: finalNodes, edges: finalEdges } = useMemo(() => {
        const initialNodes = [];
        const initialEdges = [];

        const filteredCourses = courses.filter(course =>
            course.courseRegulation?.toLowerCase() === selectedRegulation.toLowerCase()
        );

        const availableCourseIds = new Set(filteredCourses.map(c => c._id));

        filteredCourses.forEach((course) => {
            const levelKey = course.courseLevel?.toLowerCase();
            const style = LEVEL_STYLES[levelKey] || { bg: '#fff', border: '#cbd5e1', text: 'var(--primary-blue-color)' };

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
                    // الربط يتم فقط لو المتطلب موجود في نفس اللائحة المفلترة
                    if (prereqId && prereqId.trim() !== "" && availableCourseIds.has(prereqId)) {
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
    }, [courses, selectedRegulation]);

    // تحديد الليجند (Legend) بناءً على اللائحة المختارة
    const currentLegend = useMemo(() => {
        const baseLevels = ['freshman', 'sophomore', 'junior'];
        if (selectedRegulation.toLowerCase() === 'last') {
            return [...baseLevels, 'senior-1', 'senior-2'];
        }
        return [...baseLevels, 'senior'];
    }, [selectedRegulation]);

    return (
        <div className="tree-overlay">
            <div className="tree-modal">
                <div className="tree-header">
                    <div className="header-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                            <h2 className="title-text">Curriculum Dependency Map</h2>

                            {/* Regulation Tabs */}
                            <div className="regulation-switch" style={{
                                display: 'flex',
                                background: '#f1f5f9',
                                padding: '4px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0'
                            }}>
                                {['New', 'Last'].map((reg) => (
                                    <button
                                        key={reg}
                                        onClick={() => setSelectedRegulation(reg)}
                                        style={{
                                            padding: '8px 20px',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            backgroundColor: selectedRegulation === reg ? '#fff' : 'transparent',
                                            color: selectedRegulation === reg ? '#1e40af' : '#64748b',
                                            boxShadow: selectedRegulation === reg ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                                        }}
                                    >
                                        {reg} Regulation
                                    </button>
                                ))}
                            </div>
                        </div>

                        {!isSmallScreen && (
                            <div className="tree-legend">
                                {currentLegend.map((level) => {
                                    const s = LEVEL_STYLES[level];
                                    return (
                                        <div key={level} className="legend-chip">
                                            <span className="chip-dot" style={{ backgroundColor: s.border }}></span>
                                            <span style={{ textTransform: 'capitalize' }}>{level}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <button className="close-x-btn" onClick={onClose}><X size={28} /></button>
                </div>

                <div className="flow-wrapper">
                    {isSmallScreen ? (
                        <div className="mobile-warning-container" style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px',
                            textAlign: 'center',
                            color: '#64748b'
                        }}>
                            <div style={{
                                background: '#f1f5f9',
                                padding: '20px',
                                borderRadius: '50%',
                                marginBottom: '20px'
                            }}>
                                <MonitorOff size={48} strokeWidth={1.5} />
                            </div>
                            <h3 style={{ color: '#1e293b', marginBottom: '10px' }}>Desktop View Recommended</h3>
                            <p style={{ maxWidth: '300px', lineHeight: '1.6', fontSize: '0.95rem' }}>
                                The academic progress map is highly detailed and requires a larger screen for the best experience. Please switch to a tablet or desktop.
                            </p>
                        </div>
                    ) : (
                        <ReactFlow
                            key={selectedRegulation}
                            nodes={finalNodes}
                            edges={finalEdges}
                            fitView
                            connectionLineType={ConnectionLineType.SmoothStep}
                        >
                            <Background color="#f1f5f9" variant="lines" gap={40} size={1} />
                            <Controls />
                        </ReactFlow>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DependencyMap;