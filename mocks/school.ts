/**
 * 学校信息Mock数据 - GTIIT Affiliated International School
 */

import type { SchoolInfo } from '@/types';

export const mockSchoolInfo: SchoolInfo = {
  name: 'GTIIT AFFILIATED INTERNATIONAL SCHOOL',
  nameChinese: '汕头市广东以色列理工学院附属外籍人员子女学校',
  logoUrl: '/GTAIS.png',
  address: 'Shantou, Guangdong, China',
  phone: '+86 754 8678 7881',
  email: 'academicoffice@gtais.org',
  website: 'https://www.gtais.org/',
  principalName: 'School Director',
  principalTitle: 'Director',
};

export const schoolYearConfig = {
  currentYear: '2025-2026',
  quarters: {
    Q1: { start: '2025-08-25', end: '2025-10-31', name: 'Quarter 1' },
    Q2: { start: '2025-11-01', end: '2026-01-17', name: 'Quarter 2' },
    Q3: { start: '2026-02-10', end: '2026-04-17', name: 'Quarter 3' },
    Q4: { start: '2026-04-18', end: '2026-06-15', name: 'Quarter 4' },
  },
};
