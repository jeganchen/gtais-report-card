/**
 * 学生Mock数据
 */

import type { Student } from '@/types';

export const mockStudents: Student[] = [
  {
    id: 'stu-001',
    studentNumber: '2024001',
    firstName: 'Emma',
    lastName: 'Wang',
    chineseName: '王艾玛',
    gradeLevel: 3,
    homeRoom: '3A',
    guardianName: 'Michael Wang',
    guardianEmail: 'michael.wang@email.com',
    guardianPhone: '138-0001-0001',
    entryDate: '2022-09-01',
    pdfGenerated: true,
    pdfGeneratedAt: '2025-12-15T10:30:00Z',
    pdfUrl: '/reports/2024001.pdf',
  },
  {
    id: 'stu-002',
    studentNumber: '2024002',
    firstName: 'Lucas',
    lastName: 'Chen',
    chineseName: '陈卢卡斯',
    gradeLevel: 3,
    homeRoom: '3A',
    guardianName: 'Sarah Chen',
    guardianEmail: 'sarah.chen@email.com',
    guardianPhone: '138-0001-0002',
    entryDate: '2022-09-01',
    pdfGenerated: false,
  },
  {
    id: 'stu-003',
    studentNumber: '2024003',
    firstName: 'Sophia',
    lastName: 'Li',
    chineseName: '李苏菲',
    gradeLevel: 3,
    homeRoom: '3A',
    guardianName: 'David Li',
    guardianEmail: 'david.li@email.com',
    guardianPhone: '138-0001-0003',
    entryDate: '2022-09-01',
    pdfGenerated: true,
    pdfGeneratedAt: '2025-12-14T14:20:00Z',
    pdfUrl: '/reports/2024003.pdf',
  },
  {
    id: 'stu-004',
    studentNumber: '2024004',
    firstName: 'Oliver',
    lastName: 'Zhang',
    chineseName: '张奥利弗',
    gradeLevel: 4,
    homeRoom: '4A',
    guardianName: 'Jennifer Zhang',
    guardianEmail: 'jennifer.zhang@email.com',
    guardianPhone: '138-0001-0004',
    entryDate: '2021-09-01',
    pdfGenerated: false,
  },
  {
    id: 'stu-005',
    studentNumber: '2024005',
    firstName: 'Isabella',
    lastName: 'Liu',
    chineseName: '刘伊莎贝拉',
    gradeLevel: 4,
    homeRoom: '4A',
    guardianName: 'Robert Liu',
    guardianEmail: 'robert.liu@email.com',
    guardianPhone: '138-0001-0005',
    entryDate: '2021-09-01',
    pdfGenerated: true,
    pdfGeneratedAt: '2025-12-16T09:15:00Z',
    pdfUrl: '/reports/2024005.pdf',
  },
  {
    id: 'stu-006',
    studentNumber: '2024006',
    firstName: 'William',
    lastName: 'Huang',
    chineseName: '黄威廉',
    gradeLevel: 4,
    homeRoom: '4B',
    guardianName: 'Linda Huang',
    guardianEmail: 'linda.huang@email.com',
    guardianPhone: '138-0001-0006',
    entryDate: '2021-09-01',
    pdfGenerated: false,
  },
  {
    id: 'stu-007',
    studentNumber: '2024007',
    firstName: 'Mia',
    lastName: 'Yang',
    chineseName: '杨米娅',
    gradeLevel: 5,
    homeRoom: '5A',
    guardianName: 'James Yang',
    guardianEmail: 'james.yang@email.com',
    guardianPhone: '138-0001-0007',
    entryDate: '2020-09-01',
    pdfGenerated: true,
    pdfGeneratedAt: '2025-12-15T16:45:00Z',
    pdfUrl: '/reports/2024007.pdf',
  },
  {
    id: 'stu-008',
    studentNumber: '2024008',
    firstName: 'James',
    lastName: 'Wu',
    chineseName: '吴詹姆斯',
    gradeLevel: 5,
    homeRoom: '5A',
    guardianName: 'Michelle Wu',
    guardianEmail: 'michelle.wu@email.com',
    guardianPhone: '138-0001-0008',
    entryDate: '2020-09-01',
    pdfGenerated: false,
  },
  {
    id: 'stu-009',
    studentNumber: '2024009',
    firstName: 'Charlotte',
    lastName: 'Zhou',
    chineseName: '周夏洛特',
    gradeLevel: 5,
    homeRoom: '5B',
    guardianName: 'Kevin Zhou',
    guardianEmail: 'kevin.zhou@email.com',
    guardianPhone: '138-0001-0009',
    entryDate: '2020-09-01',
    pdfGenerated: true,
    pdfGeneratedAt: '2025-12-13T11:30:00Z',
    pdfUrl: '/reports/2024009.pdf',
  },
  {
    id: 'stu-010',
    studentNumber: '2024010',
    firstName: 'Benjamin',
    lastName: 'Xu',
    chineseName: '徐本杰明',
    gradeLevel: 6,
    homeRoom: '6A',
    guardianName: 'Amy Xu',
    guardianEmail: 'amy.xu@email.com',
    guardianPhone: '138-0001-0010',
    entryDate: '2019-09-01',
    pdfGenerated: false,
  },
];

export function getStudentById(id: string): Student | undefined {
  return mockStudents.find(student => student.id === id);
}

export function getStudentsByGrade(gradeLevel: number): Student[] {
  return mockStudents.filter(student => student.gradeLevel === gradeLevel);
}

export function searchStudents(query: string): Student[] {
  const lowerQuery = query.toLowerCase();
  return mockStudents.filter(student =>
    student.firstName.toLowerCase().includes(lowerQuery) ||
    student.lastName.toLowerCase().includes(lowerQuery) ||
    student.studentNumber.includes(query) ||
    student.chineseName?.includes(query)
  );
}
