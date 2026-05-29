// ─────────────────────────────────────────────────────────────────────────────
// transcriptUtils.js
// Shared utilities for StudentTranscript, StudentDetails, AdvisedStudentDetails
// ─────────────────────────────────────────────────────────────────────────────
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import swalService from "./swal";

// ═════════════════════════════════════════════════════════════════════════════
// GRADE HELPERS
// ═════════════════════════════════════════════════════════════════════════════

export const getGradeInfo = (grade) => {
    if (grade >= 97) return { letter: "A+", class: "safe", status: "Passed" };
    if (grade >= 93) return { letter: "A", class: "safe", status: "Passed" };
    if (grade >= 89) return { letter: "A-", class: "safe", status: "Passed" };
    if (grade >= 84) return { letter: "B+", class: "safe", status: "Passed" };
    if (grade >= 80) return { letter: "B", class: "safe", status: "Passed" };
    if (grade >= 76) return { letter: "B-", class: "safe", status: "Passed" };
    if (grade >= 73) return { letter: "C+", class: "safe", status: "Passed" };
    if (grade >= 70) return { letter: "C", class: "safe", status: "Passed" };
    if (grade >= 67) return { letter: "C-", class: "warning", status: "Passed" };
    if (grade >= 64) return { letter: "D+", class: "warning", status: "Passed" };
    if (grade >= 60) return { letter: "D", class: "warning", status: "Passed" };
    return { letter: "F", class: "risk", status: "Failed" };
};

export const getGPAPoints = (grade) => {
    if (grade >= 93) return 4.00;
    if (grade >= 89) return 3.70;
    if (grade >= 84) return 3.30;
    if (grade >= 80) return 3.00;
    if (grade >= 76) return 2.70;
    if (grade >= 73) return 2.30;
    if (grade >= 70) return 2.00;
    if (grade >= 67) return 1.70;
    if (grade >= 64) return 1.30;
    if (grade >= 60) return 1.00;
    return 0.00;
};

// ═════════════════════════════════════════════════════════════════════════════
// ARABIC HELPERS
// ═════════════════════════════════════════════════════════════════════════════

export const containsArabic = (text) =>
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(String(text || ""));

/**
 * يحوّل نص عربي لـ base64 PNG عن طريق Canvas —
 * بيستخدم font المتصفح (Cairo) فبيظهر صح مع RTL.
 *
 * @param {string} text       — النص العربي
 * @param {number} fontSize   — حجم الخط بالـ px (default 11)
 * @param {string} color      — لون النص (default '#1e293b')
 * @returns {{ dataUrl: string, widthMm: number, heightMm: number }}
 */
export const arabicTextToImageData = (text, fontSize = 11, color = "#1e293b") => {
    const str = String(text || "");

    // canvas مؤقت لقياس عرض النص أولاً
    const measurer = document.createElement("canvas");
    const mCtx = measurer.getContext("2d");
    mCtx.font = `${fontSize * 2}px Cairo, 'Segoe UI', Arial`;
    const measured = mCtx.measureText(str).width;

    const canvasW = Math.ceil(measured) + 20;
    const canvasH = Math.ceil(fontSize * 2 * 1.6);

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.font = `${fontSize * 2}px Cairo, 'Segoe UI', Arial`;
    ctx.fillStyle = color;
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(str, canvasW - 4, canvasH / 2);

    // تحويل px → mm  (96 dpi افتراضي)
    const pxToMm = (px) => (px * 25.4) / 96;

    return {
        dataUrl: canvas.toDataURL("image/png"),
        widthMm: pxToMm(canvasW),
        heightMm: pxToMm(canvasH),
    };
};

/**
 * helper مختصر: يرسم نص (عربي أو إنجليزي) في الـ PDF عند (x, y).
 * لو العربي → image، لو إنجليزي → doc.text عادي.
 *
 * @param {jsPDF}  doc
 * @param {string} text
 * @param {number} x          — mm من الشمال
 * @param {number} y          — mm (baseline للـ text العادي، top للـ image)
 * @param {object} opts       — { fontSize?, color?, maxWidthMm? }
 */
export const drawText = (doc, text, x, y, opts = {}) => {
    const { fontSize = 10, color = "#1e293b", maxWidthMm = 80 } = opts;
    const str = String(text || "");

    if (containsArabic(str)) {
        const imgData = arabicTextToImageData(str, fontSize, color);
        // نحسب الارتفاع الفعلي بناءً على الـ fontSize
        const heightMm = fontSize * 0.7;                      // تقريب مناسب
        const widthMm = Math.min(imgData.widthMm / 2, maxWidthMm);
        // نرسم Image بحيث baseline يتوافق مع y (نطرح نص ارتفاع)
        doc.addImage(imgData.dataUrl, "PNG", x, y - heightMm + 0.5, widthMm, heightMm + 1);
    } else {
        doc.text(str, x, y);
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// SEMESTER WORKS CALCULATOR
// ═════════════════════════════════════════════════════════════════════════════

export const calcSemesterWorkTotal = (gradeObj) => {
    const g = typeof gradeObj === "object" && gradeObj !== null ? gradeObj : {};
    return (
        (g.midTermGrade ?? 0) +
        (g.labGrade ?? 0) +
        (g.practicalGrade ?? 0) +
        (g.attendanceGrade ?? 0) +
        (g.bonusGrade ?? 0)
    );
};

// ═════════════════════════════════════════════════════════════════════════════
// FILTER HELPER
// ═════════════════════════════════════════════════════════════════════════════

export const filterCompletedCourses = (
    completedCourses = [],
    { typeFilter = "all", statusFilter = "all", semesterFilter = "all", searchTerm = "" }
) => {
    const normalize = (str) => str?.toLowerCase().replace(/[\s-]/g, "") ?? "";

    return completedCourses.filter((c) => {
        const matchesType =
            typeFilter === "all" ||
            normalize(c.courseId?.courseType) === normalize(typeFilter);

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "passed" && c.grade >= 60) ||
            (statusFilter === "failed" && c.grade < 60);

        const matchesSemester =
            semesterFilter === "all" || c.semesterId === semesterFilter;

        const matchesSearch =
            c.courseId?.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.courseId?._id?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesType && matchesStatus && matchesSemester && matchesSearch;
    });
};

// ═════════════════════════════════════════════════════════════════════════════
// GROUP BY SEMESTER
// ═════════════════════════════════════════════════════════════════════════════

export const groupBySemester = (courses = []) =>
    courses.reduce((acc, course) => {
        const sem = course.semesterId || "Unknown";
        if (!acc[sem]) acc[sem] = [];
        acc[sem].push(course);
        return acc;
    }, {});

// ═════════════════════════════════════════════════════════════════════════════
// SEMESTER STATS
// ═════════════════════════════════════════════════════════════════════════════

export const calcSemesterStats = (courses = []) => {
    let total = 0, done = 0, wPoints = 0;
    courses.forEach((c) => {
        const cr = c.courseId?.courseCredits || 0;
        total += cr;
        if (c.grade >= 60) done += cr;
        wPoints += getGPAPoints(c.grade) * cr;
    });
    const gpa = total > 0 ? (wPoints / total).toFixed(2) : "0.00";
    return { totalCredits: total, completedCredits: done, gpa };
};

// ═════════════════════════════════════════════════════════════════════════════
// PDF COLORS
// ═════════════════════════════════════════════════════════════════════════════

export const PDF_COLORS = {
    DARK: [30, 41, 59],
    BLUE: [37, 99, 235],
    GREEN: [16, 185, 129],
    RED: [239, 68, 68],
    AMBER: [245, 158, 11],
    LIGHT_BG: [241, 245, 249],
    MUTED: [100, 116, 139],
    WHITE: [255, 255, 255],
    SUMMARY_BG: [248, 250, 252],
};

// ═════════════════════════════════════════════════════════════════════════════
// PDF BUILDER
// ═════════════════════════════════════════════════════════════════════════════

export const exportTranscriptPDF = async ({
    transcript,
    advisor,
    semester,
    semesterWorks = [],
    extractedByRole = null,
}) => {
    swalService.showLoading("Generating official academic transcript...");

    try {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

        // ── بيانات الطالب ──
        const studentName = String(transcript.studentId?.studentName || "N/A");
        const studentId = String(transcript.studentId?._id || "N/A");
        const studentUsername = String(transcript.studentId?.username || "N/A");
        const studentEmail = String(transcript.studentId?.studentEmail || "N/A");
        const studentPhone = String(transcript.studentId?.studentPhone || "N/A");
        const department = String(transcript.department || "N/A");
        const regulation = String(transcript.regulation || "N/A");
        const level = String(transcript.level || "N/A");
        const gpa = Number(transcript.GPA || 0).toFixed(2);
        const totalCredits = transcript.completedCredits || 0;
        const atRisk = transcript.atRisk;
        const alerts = transcript.alerts || 0;
        const totalAlerts = transcript.totalAlerts || 0;
        const advisorName = advisor?.staffName || "Not Assigned";

        const { DARK, BLUE, GREEN, RED, AMBER, LIGHT_BG, MUTED, WHITE, SUMMARY_BG } = PDF_COLORS;

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 14;

        // ══════════════════════════════════════════════════════
        // HEADER BAR
        // ══════════════════════════════════════════════════════
        doc.setFillColor(...DARK);
        doc.rect(0, 0, pageW, 22, "F");

        doc.setFontSize(14);
        doc.setTextColor(...WHITE);
        doc.setFont(undefined, "bold");
        doc.text("Official Academic Transcript", margin, 14);

        doc.setFontSize(9);
        doc.setFont(undefined, "normal");
        doc.setTextColor(203, 213, 225);
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 14, { align: "right" });

        // ══════════════════════════════════════════════════════
        // STUDENT INFO BLOCK
        // ══════════════════════════════════════════════════════
        let y = 30;

        // helper: يطبع label+value مع دعم العربي في الـ value
        const printInfoRow = (label, value, yPos) => {
            // Label دايماً إنجليزي
            doc.setFont(undefined, "bold");
            doc.setTextColor(...MUTED);
            doc.setFontSize(10);
            doc.text(`${label}:`, margin, yPos);

            // Value — عربي أو إنجليزي
            doc.setFont(undefined, "normal");
            doc.setTextColor(...DARK);
            if (containsArabic(String(value))) {
                drawText(doc, String(value), margin + 38, yPos, {
                    fontSize: 10,
                    color: `rgb(${DARK.join(",")})`,
                    maxWidthMm: 70,
                });
            } else {
                doc.text(String(value), margin + 38, yPos);
            }
        };

        const leftData = [
            ["Student Name", studentName],
            ["Student ID", studentId],
            ["Username", `@${studentUsername}`],
            ["Email", studentEmail],
            ["Phone", studentPhone],
            ["Department", department],
            ["Regulation", `${regulation} Regulation`],
            ["Academic Level", level],
        ];

        leftData.forEach(([label, value]) => {
            printInfoRow(label, value, y);
            y += 6;
        });

        // Right column — GPA box
        const boxX = pageW - margin - 66;
        const boxY = 28;
        const boxW = 66;
        const boxH = 42;

        doc.setFillColor(...LIGHT_BG);
        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.5);
        doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, "FD");

        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.setTextColor(...BLUE);
        doc.text(`GPA: ${gpa} / 4.0`, boxX + boxW / 2, boxY + 10, { align: "center" });

        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        doc.setFont(undefined, "normal");
        doc.text(`Total Credits: ${totalCredits} Hrs`, boxX + boxW / 2, boxY + 19, { align: "center" });
        doc.text(`Level: ${level}`, boxX + boxW / 2, boxY + 27, { align: "center" });

        doc.setFillColor(...(atRisk ? RED : GREEN));
        doc.roundedRect(boxX + 8, boxY + 33, boxW - 16, 7, 2, 2, "F");
        doc.setFontSize(8);
        doc.setTextColor(...WHITE);
        doc.setFont(undefined, "bold");
        doc.text(
            atRisk ? "At Risk" : "Good Standing",
            boxX + boxW / 2, boxY + 37.5,
            { align: "center" }
        );

        y = Math.max(y, boxY + boxH) + 6;

        // ── Alerts row ──
        doc.setFillColor(255, 251, 235);
        doc.setDrawColor(...AMBER);
        doc.setLineWidth(0.4);
        doc.roundedRect(margin, y, pageW - margin * 2, 10, 2, 2, "FD");
        doc.setFontSize(9);
        doc.setFont(undefined, "normal");
        doc.setTextColor(120, 80, 0);
        doc.text(
            `Academic Alerts — Consecutive: ${alerts}/4   |   Total: ${totalAlerts}/6   |   Advisor: ${advisorName}`,
            margin + 3, y + 6.5
        );
        y += 16;

        // ── Extracted By box ──
        if (extractedByRole) {
            doc.setFillColor(239, 246, 255);
            doc.setDrawColor(...BLUE);
            doc.setLineWidth(0.4);
            doc.roundedRect(margin, y, pageW - margin * 2, 12, 2, 2, "FD");

            doc.setFontSize(9);
            doc.setFont(undefined, "bold");
            doc.setTextColor(...BLUE);
            doc.text(`Extracted by (${extractedByRole}):`, margin + 3, y + 5);

            doc.setFont(undefined, "normal");
            doc.setTextColor(...DARK);
            doc.text(
                `Role: ${extractedByRole}   |   ${new Date().toLocaleString()}`,
                margin + 58, y + 5
            );

            doc.setFillColor(...BLUE);
            doc.rect(pageW - margin - 4, y, 4, 12, "F");

            y += 18;
        }

        // ══════════════════════════════════════════════════════
        // TABLE 1 — SEMESTER WORKS
        // ══════════════════════════════════════════════════════
        if (semesterWorks.length > 0) {
            const semId = semester?._id || semester?.name || "";
            doc.setFontSize(11);
            doc.setFont(undefined, "bold");
            doc.setTextColor(...DARK);
            doc.text(`Current Semester Works  —  ${semId}`, margin, y);
            y += 2;

            const worksBody = semesterWorks.map((w) => {
                const total = calcSemesterWorkTotal(w.grade);
                const g = typeof w.grade === "object" && w.grade !== null ? w.grade : {};
                return [
                    String(w.courseId?._id || "N/A"),
                    String(w.courseId?.courseName || "N/A"),
                    String(g.midTermGrade ?? 0),
                    String(g.labGrade ?? 0),
                    String(g.practicalGrade ?? 0),
                    String(g.attendanceGrade ?? 0),
                    String(g.bonusGrade ?? 0),
                    `${total}/50`,
                ];
            });

            autoTable(doc, {
                startY: y + 3,
                head: [["Code", "Course Name", "Mid.", "Lab", "Prac.", "Att.", "Bon.", "Total"]],
                body: worksBody,
                headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold", fontSize: 9 },
                bodyStyles: { fontSize: 9, textColor: DARK },
                alternateRowStyles: { fillColor: SUMMARY_BG },
                columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 60 } },
                margin: { left: margin, right: margin },
                theme: "plain",
                tableLineColor: [226, 232, 240],
                tableLineWidth: 0.3,
            });

            y = doc.lastAutoTable.finalY + 10;
        }

        // ══════════════════════════════════════════════════════
        // TABLE 2 — ACADEMIC HISTORY
        // ══════════════════════════════════════════════════════
        if (y > pageH - 50) { doc.addPage(); y = 20; }

        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.setTextColor(...DARK);
        doc.text("Academic Transcript History", margin, y);
        y += 4;

        const grouped = groupBySemester(transcript.completedCourses || []);
        const sortedSems = Object.keys(grouped).sort();

        for (const sem of sortedSems) {
            const courses = grouped[sem];
            const { totalCredits: semTotalCr, completedCredits: semDoneCr, gpa: semGPA } =
                calcSemesterStats(courses);

            // ── نبني الـ body ونعالج الأسماء العربية ──
            const semBody = courses.map((c) => {
                const info = getGradeInfo(c.grade);
                const cd = c.courseId || {};

                // اسم الكورس — لو عربي نحوله image data URL
                const rawName = String(cd.courseName || "N/A");
                const courseNameCell = containsArabic(rawName)
                    ? {
                        content: " ",           // placeholder (autoTable بيحتاج content)
                        _arabicImg: arabicTextToImageData(rawName, 8, `rgb(${DARK.join(",")})`),
                    }
                    : rawName;

                return [
                    String(cd._id || "N/A"),
                    courseNameCell,
                    String(cd.courseLevel || "N/A"),
                    String(cd.courseType || "N/A"),
                    String(cd.courseCredits || 0),
                    info.status,
                    `${c.grade}  (${info.letter})`,
                    String(cd.courseRegulation || "N/A"),
                ];
            });

            // Summary row
            semBody.push([
                { content: "Semester Summary", colSpan: 4, styles: { halign: "right", fontStyle: "bold", fillColor: SUMMARY_BG, textColor: MUTED } },
                { content: `${semDoneCr}/${semTotalCr} Hrs`, styles: { fontStyle: "bold", fillColor: SUMMARY_BG, textColor: DARK } },
                { content: `Semester GPA: ${semGPA}`, colSpan: 3, styles: { fontStyle: "bold", fillColor: SUMMARY_BG, textColor: BLUE } },
            ]);

            autoTable(doc, {
                startY: y + 3,
                head: [
                    [{ content: `Semester: ${sem}`, colSpan: 8, styles: { fillColor: LIGHT_BG, textColor: DARK, fontStyle: "bold", fontSize: 10 } }],
                    ["Code", "Course Name", "Level", "Type", "Cr.", "Status", "Grade", "Reg."],
                ],
                body: semBody,
                headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold", fontSize: 8.5 },

                // ── هنا نرسم الصور العربية بعد ما autoTable يرسم الـ cells ──
                didDrawCell(hookData) {
                    if (hookData.section !== "body") return;
                    const cell = hookData.cell;
                    if (!cell.raw?._arabicImg) return;

                    const { dataUrl, widthMm } = cell.raw._arabicImg;
                    const cellH = cell.height;
                    const imgH = Math.min(cellH - 2, 5);           // max 5 mm ارتفاع
                    const scale = imgH / (cell.raw._arabicImg.heightMm || 1);
                    const imgW = Math.min(widthMm * scale, cell.width - 2);
                    const imgX = cell.x + cell.width - imgW - 1;   // محاذاة يمين
                    const imgY = cell.y + (cellH - imgH) / 2;

                    doc.addImage(dataUrl, "PNG", imgX, imgY, imgW, imgH);
                },

                didParseCell(hookData) {
                    if (hookData.section === "head" && hookData.row.index === 0) {
                        hookData.cell.styles.fillColor = LIGHT_BG;
                        hookData.cell.styles.textColor = DARK;
                    }
                    if (hookData.section === "body") {
                        const isSummaryRow = hookData.row.index === courses.length;
                        if (!isSummaryRow && hookData.column.index === 5) {
                            const status = hookData.cell.raw;
                            if (status === "Passed") {
                                hookData.cell.styles.textColor = GREEN;
                                hookData.cell.styles.fontStyle = "bold";
                            } else if (status === "Failed") {
                                hookData.cell.styles.textColor = RED;
                                hookData.cell.styles.fontStyle = "bold";
                            }
                        }
                        // الـ cell اللي فيها عربي — نخلي النص الـ placeholder مش ظاهر
                        if (hookData.cell.raw?._arabicImg) {
                            hookData.cell.styles.textColor = [255, 255, 255, 0]; // transparent
                        }
                    }
                },

                bodyStyles: { fontSize: 8.5, textColor: DARK },
                alternateRowStyles: { fillColor: SUMMARY_BG },
                columnStyles: {
                    0: { cellWidth: 22 },
                    1: { cellWidth: 52 },
                    2: { cellWidth: 18 },
                    3: { cellWidth: 30 },
                    4: { cellWidth: 10 },
                    5: { cellWidth: 16 },
                    6: { cellWidth: 20 },
                    7: { cellWidth: 16 },
                },
                margin: { left: margin, right: margin },
                theme: "plain",
                tableLineColor: [226, 232, 240],
                tableLineWidth: 0.3,
            });

            y = doc.lastAutoTable.finalY + 8;
        }

        // ══════════════════════════════════════════════════════
        // FOOTER على كل صفحة
        // ══════════════════════════════════════════════════════
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            doc.setDrawColor(...MUTED);
            doc.setLineWidth(0.3);
            doc.line(margin, pageH - 16, pageW - margin, pageH - 16);

            doc.setFontSize(8);
            doc.setTextColor(...MUTED);
            doc.setFont(undefined, "normal");
            doc.text(
                `Official Academic Transcript  •  ${department}  •  ${regulation} Regulation`,
                margin, pageH - 11
            );
            doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 11, { align: "right" });

            if (extractedByRole) {
                doc.setFontSize(7.5);
                doc.setTextColor(...BLUE);
                doc.setFont(undefined, "bold");
                doc.text("Extracted by:", margin, pageH - 6);
                doc.setFont(undefined, "normal");
                doc.setTextColor(...DARK);
                doc.text(extractedByRole, margin + 22, pageH - 6);
            }
        }

        doc.save(`Official_Transcript_${studentId}.pdf`);
        swalService.success("Success", "Academic transcript exported successfully.");
    } catch (err) {
        console.error("PDF Export Error:", err);
        swalService.error("Export Failed", "Error: " + err.message);
    }
};