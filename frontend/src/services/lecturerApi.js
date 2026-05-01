import api from "./api"; // ملف الـ interceptor بتاعك

export const lecturerApi = {
    getMyCourses: () => api.get("/lecturers/me/courses"),
    getCourseDetails: (offeringId) => api.get(`/lecturers/me/courses/${offeringId}`),
    getCourseStudents: (courseId) => api.get(`/semester-work/course/${courseId}`),
    assignSchema: (offeringId, schema) => api.put(`/lecturers/me/courses/${offeringId}/schema`, schema),
    submitGrades: (offeringId, grades) => api.put(`/lecturers/me/courses/${offeringId}/grades`, { grades }),
    takeAttendance: (offeringId, studentIds) => api.put(`/lecturers/me/courses/${offeringId}/attendance`, { students: studentIds }),
};