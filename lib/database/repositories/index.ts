/**
 * 数据仓库模块导出
 */

// 学生相关
export { StudentRepository, studentRepository, type StudentFilter, type PaginationOptions } from './student.repo';

// 学校、学期、教师相关
export { SchoolRepository, schoolRepository } from './school.repo';
export { TermRepository, termRepository } from './term.repo';
export { TeacherRepository, teacherRepository } from './teacher.repo';

// 课程相关
export { CourseRepository, courseRepository, SectionRepository, sectionRepository } from './course.repo';

// 成绩相关
export { StandardRepository, standardRepository, StoredGradeRepository, storedGradeRepository } from './stored-grade.repo';

// 考勤相关
export { AttendanceCodeRepository, attendanceCodeRepository, AttendanceRepository, attendanceRepository } from './attendance.repo';

// 联系人相关
export {
  PersonRepository,
  personRepository,
  StudentContactRepository,
  studentContactRepository,
  EmailAddressRepository,
  emailAddressRepository,
  PersonEmailAssocRepository,
  personEmailAssocRepository,
  PhoneNumberRepository,
  phoneNumberRepository,
  PersonPhoneAssocRepository,
  personPhoneAssocRepository,
} from './contact.repo';

// 系统配置
export { SettingsRepository, settingsRepository, type PowerSchoolConfig, type AzureADConfig, type SMTPConfig, type SignatureConfig } from './settings.repo';
export { SyncLogRepository, syncLogRepository, type SyncType, type SyncStatus } from './sync-log.repo';
export { UserRepository, userRepository, type CreateUserInput, type UpdateUserInput, type UserRole, type AuthProvider } from './user.repo';
