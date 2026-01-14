/**
 * PowerSchool API 响应类型定义
 */

// Token响应
export interface PSTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

// 学生信息
export interface PSStudent {
  id: number;
  dcid: number;
  student_number: string;
  first_name: string;
  last_name: string;
  grade_level: number;
  home_room?: string;
  dob?: string;
  lastfirst?: string;
  state_studentnumber?: string;
  sched_nextyeargrade?: number;
}

// 学年/学期
export interface PSTerm {
  dcid: number;
  id: number;
  name: string;
  abbreviation?: string;
  firstday: string;
  lastday: string;
  yearid: number;
  schoolid: number;
}

// 学校信息
export interface PSSchool {
  id: number;
  dcid: number;
  name: string;
  school_number: number;
  schooladdress?: string;
  schoolcity?: string;
  schoolstate?: string;
  schoolzip?: string;
  schoolphone?: string;
  schoolfax?: string;
}

// 课程信息
export interface PSCourse {
  dcid: number;
  course_number: string;
  course_name: string;
}

// 学习标准
export interface PSStandard {
  id: number;
  standardid?: number;
  identifier: string;
  name: string;
  description?: string;
  parentstandardid?: number;
  yearid?: number;
  isactive?: number;
  isexcludedfromreports?: number;
  isassignmentallowed?: number;
  displayposition?: number;
  transientcourselist?: string;
}

// 标准成绩
export interface PSStandardGrade {
  standardgradesectionid: number;
  studentsdcid: number;
  standardid: number;
  grade: string;
  storecode: string; // Q1, Q2, Q3, Q4, etc.
  sectionsdcid: number;
}

// 标准成绩评语
export interface PSStandardGradeComment {
  commentvalue: string;
  standardgradesectionid: number;
}

// 考勤代码
export interface PSAttendanceCode {
  code: string;
  presence_status_cd: string; // 'Present', 'Absent', 'Tardy'
}

// 考勤记录
export interface PSAttendance {
  studentid: number;
  att_code: string;
  date_value: string;
  sectionid: number;
  schoolid: number;
  termid: number;
}

// PowerQuery Named Query 响应
export interface PSNamedQueryResponse<T> {
  name: string;
  record: T[];
  '@extensions'?: string;
}

// PowerQuery Count 响应
export interface PSCountResponse {
  count: number;
}

// API分页参数
export interface PSPaginationParams {
  page?: number;
  pagesize?: number;
  projection?: string;
  q?: string;
  order?: string;
}

// API响应包装
export interface PSApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

// 学生用户自定义字段
export interface PSStudentUserFields {
  studentsdcid: number;
  cust_homeroomteacher?: string;
  cust_counselor?: string;
  cust_preferredname?: string;
}

// 联系人信息
export interface PSContact {
  contactid: number;
  firstname: string;
  lastname: string;
  email?: string;
  phonedaytime?: string;
  relationship: string;
  isguardian: boolean;
  isprimarycontact: boolean;
  studentid: number;
}

// 选课记录
export interface PSCC {
  studentid: number;
  sectionid: number;
  termid: number;
  dcid: number;
}

// Section信息
export interface PSSection {
  id: number;
  dcid: number;
  course_number: string;
  termid: number;
}

