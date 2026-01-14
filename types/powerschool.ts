/**
 * PowerSchool API 返回数据类型定义
 */

// ============================================================
// 基础信息
// ============================================================

/** 学校 (SCHOOLS) */
export interface PSSchool {
  id: number;
  dcid: number;
  school_number?: string;
  name: string;
  abbreviation?: string;
}

/** 学期 (TERMS) */
export interface PSTerm {
  id: number;
  dcid: number;
  schoolid: number;
  name: string;
  abbreviation?: string;
  firstday: string;
  lastday: string;
  yearid: number;
  isyearrec?: number; // 1 = 学年记录, 0 = 学期记录
}

/** 教师 (TEACHERS) */
export interface PSTeacher {
  id: number;
  dcid: number;
  lastfirst?: string;
  first_name: string;
  last_name: string;
  email_addr?: string;
  schoolid: number;
  staffstatus?: number;
}

// ============================================================
// 学生
// ============================================================

/** 学生 (STUDENTS) */
export interface PSStudent {
  id: number;
  dcid: number;
  student_number: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  gender?: string;
  grade_level: number;
  schoolid: number;
  home_room?: string;
  enroll_status?: number;
  entrydate?: string;
  exitdate?: string;
  dob?: string;
  family_ident?: number;
  street?: string;
  city?: string;
  home_phone?: string;
  guardianemail?: string;
}

// ============================================================
// 课程
// ============================================================

/** 课程 (COURSES) */
export interface PSCourse {
  id: number;
  dcid: number;
  course_number: string;
  course_name: string;
  credit_hours?: number;
}

/** 课节/班级 (SECTIONS) */
export interface PSSection {
  id: number;
  dcid: number;
  course_number: string;
  section_number: string;
  teacher: number; // teacher ID
  termid: number;
  schoolid: number;
  expression?: string;
}

/** 学生选课记录 (CC) */
export interface PSStudentEnrollment {
  id: number;
  dcid: number;
  studentid: number;
  course_number: string;
  sectionid: number;
  termid: number;
  schoolid: number;
  dateenrolled?: string;
  dateleft?: string;
}

// ============================================================
// 成绩与考勤
// ============================================================

/** 学科标准 (STANDARDS) */
export interface PSStandard {
  id: number;
  dcid: number;
  identifier: string;
  name: string;
  description?: string;
  subjectarea?: string;
  listorder?: number;
}

/** 期末成绩 (STOREDGRADES) */
export interface PSStoredGrade {
  id: number;
  dcid: number;
  studentid: number;
  schoolid: number;
  termid: number;
  course_number: string;
  sectionid?: number;
  grade?: string;
  percent?: number;
  gpa_points?: number;
  storecode?: string; // Q1, Q2, Q3, Q4, S1, S2, Y1
}

/** 考勤记录 (ATTENDANCE) */
export interface PSAttendance {
  id: number;
  dcid: number;
  studentid: number;
  att_date: string;
  attendance_codeid: number;
  periodid?: number;
  sectionid?: number;
  schoolid: number;
  yearid: number;
  att_mode_code?: string;
}

/** 考勤代码 (ATTENDANCE_CODE) */
export interface PSAttendanceCode {
  id: number;
  dcid: number;
  schoolid: number;
  yearid: number;
  att_code: string;
  description?: string;
  presence_status_cd?: string; // Present, Absent, Tardy
}

// ============================================================
// 联系人
// ============================================================

/** 个人 (PERSON) */
export interface PSPerson {
  id: number;
  dcid: number;
  firstname: string;
  lastname: string;
  middlename?: string;
  isactive?: number;
}

/** 学生联系人关联 (STUDENTCONTACTASSOC) */
export interface PSStudentContactAssoc {
  studentcontactassocid: number;
  studentdcid: number;
  personid: number;
  contactpriorityorder?: number;
  currreltypecodesetid?: number;
}

/** 邮箱 (EMAILADDRESS) */
export interface PSEmailAddress {
  emailaddressid: number;
  emailaddress: string;
}

/** 个人邮箱关联 (PERSONEMAILADDRESSASSOC) */
export interface PSPersonEmailAssoc {
  personemailaddressassocid: number;
  personid: number;
  emailaddressid: number;
  isprimaryemailaddress?: number;
}

/** 电话 (PHONENUMBER) */
export interface PSPhoneNumber {
  phonenumberid: number;
  phonenumber: string;
}

/** 个人电话关联 (PERSONPHONENUMBERASSOC) */
export interface PSPersonPhoneAssoc {
  personphonenumberassocid: number;
  personid: number;
  phonenumberid: number;
  ispreferred?: number;
}

// ============================================================
// API 响应结构
// ============================================================

/** PowerSchool Named Query 响应结构 */
export interface PSQueryResponse<T> {
  name: string;
  record: Array<{
    id: number;
    name?: string;
    tables: {
      [tableName: string]: T;
    };
  }>;
  '@extensions'?: string;
}

/** 同步类型 */
export type SyncDataType =
  | 'schools'
  | 'terms'
  | 'teachers'
  | 'students'
  | 'courses'
  | 'sections'
  | 'enrollments'
  | 'standards'
  | 'grades'
  | 'attendance'
  | 'attendance_codes'
  | 'contacts'
  | 'full';

/** 同步结果 */
export interface SyncResult {
  success: boolean;
  type: SyncDataType;
  recordCount: number;
  error?: string;
  duration?: number;
}
