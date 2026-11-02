// /**
//  * Scoto ERP - Type Definitions & Schema Constants
//  * Matches FastAPI Pydantic Models & MSSQL/MySQL Enums
//  * Backend Reference: C:\Projects\Scoto\office\scoto-backend
//  */

// export const USER_ROLES = {
//   SUPER_ADMIN: 'SUPER_ADMIN',
//   ADMIN: 'ADMIN',
//   HR_MANAGER: 'HR_MANAGER',
//   ACCOUNTS_OFFICER: 'ACCOUNTS_OFFICER',
//   EMPLOYEE: 'EMPLOYEE',
// };

// export const DEPARTMENTS = [
//   'Engineering',
//   'DevOps & Cloud',
//   'Product & Design',
//   'Quality Assurance',
//   'Human Resources',
//   'Finance & Accounts',
//   'Sales & Marketing',
// ];

// // Matches backend DayStatusEnum and ERP statuses
// export const ATTENDANCE_STATUS = {
//   FULL_DAY: 'FULL_DAY',
//   HALF_DAY: 'HALF_DAY',
//   SHORT_HOURS: 'SHORT_HOURS',
//   SINGLE_PUNCH_ANOMALY: 'SINGLE_PUNCH_ANOMALY',
//   ABSENT: 'ABSENT',
//   PRESENT: 'PRESENT',
//   LATE: 'LATE',
//   ON_LEAVE: 'ON_LEAVE',
//   HOLIDAY: 'HOLIDAY',
// };

// export const PUNCH_DIRECTION = {
//   IN: 'IN',
//   OUT: 'OUT',
// };

// export const VERIFICATION_METHOD = {
//   FACE_AI: 'AI Face Recognition (3D Depth)',
//   FACE_LIVE: 'Live Face Camera Scan',
//   FACE_MOBILE: 'Mobile Face Recognition (Geo-Fenced)',
// };

// export const PAYROLL_STATUS = {
//   DRAFT: 'DRAFT',
//   LOCKED: 'LOCKED',
//   DISBURSED: 'DISBURSED',
// };

// export const VOUCHER_CATEGORY = {
//   OFFICE_SNACKS: 'Office Snacks & Pantry',
//   HARDWARE_CABLES: 'Hardware & Cables',
//   CLIENT_LUNCH: 'Client Meeting & Lunch',
//   TRAVEL_CONVEYANCE: 'Travel & Conveyance',
//   OFFICE_SUPPLIES: 'Office Supplies & Stationery',
//   SOFTWARE_CLOUD: 'Cloud Services & Tooling',
// };

// export const VOUCHER_STATUS = {
//   PENDING: 'PENDING',
//   APPROVED: 'APPROVED',
//   REJECTED: 'REJECTED',
// };

// export const SHIFT_TIMINGS = {
//   GENERAL: { label: 'General Shift (09:00 AM - 06:00 PM)', start: '09:00', end: '18:00', gracePeriod: 30 },
//   EARLY: { label: 'Early Shift (08:00 AM - 05:00 PM)', start: '08:00', end: '17:00', gracePeriod: 30 },
//   LATE: { label: 'Late Shift (11:00 AM - 08:00 PM)', start: '11:00', end: '20:00', gracePeriod: 30 },
// };

// export const TENANT_DATABASES = [
//   { key: 'db1', label: 'etimetracklite1 (Production HW)', description: 'eSSL Face Attendance DB 1' },
//   { key: 'db2', label: 'ESM_DYEING_ERP (Secondary ERP)', description: 'eSSL Face Attendance DB 2' },
// ];
