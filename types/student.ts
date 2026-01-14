/**
 * 学生信息类型定义
 */

export interface Student {
  id: string;
  psId?: number;               // PowerSchool ID
  studentNumber: string;       // 学号
  firstName: string;           // 名
  lastName: string;            // 姓
  middleName?: string;         // 中间名（可选）
  chineseName?: string;        // 中文名（可选）
  gender?: string;             // 性别
  gradeLevel: number;          // 年级
  homeRoom?: string;           // 班级
  enrollStatus?: number;       // 入学状态
  entryDate?: string;          // 入学日期
  exitDate?: string;           // 离校日期
  dob?: string;                // 出生日期
  street?: string;             // 地址
  city?: string;               // 城市
  homePhone?: string;          // 家庭电话
  guardianName?: string;       // 家长姓名
  guardianEmail?: string;      // 家长邮箱
  guardianPhone?: string;      // 家长电话
  schoolId?: number;           // PowerSchool School ID (ps_school_id)
  schoolName?: string;         // 学校名称
  pdfGenerated: boolean;       // 是否已生成PDF
  pdfGeneratedAt?: string;     // PDF生成时间
  pdfUrl?: string;             // PDF文件URL
}

export interface StudentListResponse {
  students: Student[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StudentFilters {
  search?: string;
  gradeLevel?: number;
  homeRoom?: string;
  enrollStatus?: number;
  schoolId?: number;           // PowerSchool School ID (ps_school_id)
  pdfGenerated?: boolean;
}

/**
 * 学生联系人信息
 */
export interface StudentContact {
  personId: string;
  firstName: string;
  lastName: string;
  relationship?: string;
  priority?: number;
  email?: string;
  phone?: string;
  isPrimaryEmail?: boolean;
  isPrimaryPhone?: boolean;
}
