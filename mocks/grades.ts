/**
 * 成绩/评价Mock数据 - 基于真实Report Card样本 (EY PK1 Report Card)
 */

import type { StudentGrades, Subject, Standard, ScoreLevel } from '@/types';

const createStandard = (
  id: string,
  name: string,
  scores: [ScoreLevel, ScoreLevel, ScoreLevel, ScoreLevel]
): Standard => ({
  id,
  name,
  quarterScores: [
    { quarter: 'Q1', score: scores[0] },
    { quarter: 'Q2', score: scores[1] },
    { quarter: 'Q3', score: scores[2] },
    { quarter: 'Q4', score: scores[3] },
  ],
});

// 语言与识字
const languageLiteracy: Subject = {
  id: 'sub-lang',
  name: 'Language and Literacy',
  standards: [
    createStandard('lang-1', 'Listens to and understands increasingly complex language', ['-', 'A', 'A', 'P']),
    createStandard('lang-2', 'Uses language to express thoughts and needs', ['-', 'A', 'A', 'P']),
    createStandard('lang-3', 'Uses appropriate conversational and other communication skills', ['-', 'A', 'A', 'A']),
    createStandard('lang-4', 'Demonstrates progress in speaking English', ['-', 'P', 'P', 'P']),
    createStandard('lang-5', 'Demonstrates phonological awareness, phonics skills, word recognition', ['-', '-', '-', 'A']),
    createStandard('lang-6', 'Demonstrates knowledge of alphabet and use of print', ['-', '-', 'A', 'A']),
    createStandard('lang-7', 'Comprehends and responds to books and other texts', ['-', 'P', 'P', 'P']),
    createStandard('lang-8', 'Demonstrates beginning writing skills', ['-', 'A', 'A', 'A']),
  ],
};

// 数学与科学
const mathScience: Subject = {
  id: 'sub-math',
  name: 'Math and Science',
  standards: [
    createStandard('math-1', 'Counts, quantifies, and connects numerals with their quantities', ['-', 'A', 'A', 'A']),
    createStandard('math-2', 'Explores and describes spatial relationships and shapes', ['-', '-', 'A', 'A']),
    createStandard('math-3', 'Compares and measures', ['-', '-', '-', 'A']),
    createStandard('math-4', 'Demonstrates knowledge of patterns', ['-', '-', 'A', 'A']),
    createStandard('math-5', 'Uses scientific inquiry skills', ['-', '-', 'A', 'A']),
  ],
};

// 社会学习与艺术
const socialArts: Subject = {
  id: 'sub-social',
  name: 'Social Studies and the Arts',
  standards: [
    createStandard('social-1', 'Demonstrates a positive self-concept; gains confidence in own identity', ['-', 'P', 'P', 'P']),
    createStandard('social-2', 'Explores change related to familiar people or places', ['-', 'A', 'P', 'P']),
    createStandard('social-3', 'Explores visual arts, dance and movement, and drama', ['-', 'A', 'P', 'P']),
    createStandard('social-4', 'Uses elements of art and dramatic play to represent their world', ['-', 'P', 'P', 'P']),
  ],
};

// 社会情感与个人发展
const socialEmotional: Subject = {
  id: 'sub-emotional',
  name: 'Social-Emotional and Personal',
  standards: [
    createStandard('emo-1', 'Regulates emotions and behaviors', ['-', 'A', 'P', 'P']),
    createStandard('emo-2', 'Recognises the feelings and perspectives of others; appreciates diversity and shows respect for others regardless of differences', ['-', 'A', 'A', 'A']),
    createStandard('emo-3', 'Establishes and sustains positive relationships', ['-', 'A', 'P', 'P']),
    createStandard('emo-4', 'Participates cooperatively and constructively in pairs and groups', ['-', 'A', 'P', 'A']),
    createStandard('emo-5', 'Shows socially acceptable behaviours such as taking turns and showing respect by listening to the views of others', ['-', 'A', 'A', 'A']),
    createStandard('emo-6', 'Demonstrates positive approaches to learning', ['-', 'A', 'A', 'A']),
    createStandard('emo-7', 'Remembers and connects experiences', ['-', 'A', 'A', 'P']),
    createStandard('emo-8', 'Demonstrates independence and responsibility in following classroom routines', ['-', 'A', 'P', 'P']),
    createStandard('emo-9', 'Demonstrates positive learning dispositions (curiosity, confidence, persistence)', ['-', 'A', 'A', 'A']),
    createStandard('emo-10', 'Demonstrates fine-motor strength and coordination', ['-', 'P', 'P', 'P']),
    createStandard('emo-11', 'Demonstrates gross-motor and balancing skills', ['-', 'P', 'P', 'P']),
  ],
};

// 小学阶段的学科设置
const elementaryEnglish: Subject = {
  id: 'sub-ela',
  name: 'English Language Arts',
  standards: [
    createStandard('ela-1', 'Reading Comprehension', ['P', 'P', 'E', 'E']),
    createStandard('ela-2', 'Vocabulary Development', ['A', 'P', 'P', 'E']),
    createStandard('ela-3', 'Writing Organization', ['P', 'P', 'P', 'E']),
    createStandard('ela-4', 'Writing Conventions', ['A', 'A', 'P', 'P']),
    createStandard('ela-5', 'Speaking & Listening', ['E', 'E', 'E', 'E']),
  ],
};

const elementaryMath: Subject = {
  id: 'sub-math-elem',
  name: 'Mathematics',
  standards: [
    createStandard('math-elem-1', 'Number Sense and Operations', ['P', 'P', 'E', 'E']),
    createStandard('math-elem-2', 'Algebraic Thinking', ['P', 'E', 'E', 'E']),
    createStandard('math-elem-3', 'Measurement & Data', ['A', 'P', 'P', 'P']),
    createStandard('math-elem-4', 'Geometry', ['P', 'P', 'P', 'E']),
    createStandard('math-elem-5', 'Problem Solving', ['A', 'A', 'P', 'P']),
  ],
};

const elementaryScience: Subject = {
  id: 'sub-sci-elem',
  name: 'Science',
  standards: [
    createStandard('sci-elem-1', 'Life Science', ['P', 'E', 'E', 'E']),
    createStandard('sci-elem-2', 'Physical Science', ['P', 'P', 'P', 'E']),
    createStandard('sci-elem-3', 'Earth Science', ['A', 'P', 'P', 'P']),
    createStandard('sci-elem-4', 'Scientific Inquiry', ['E', 'E', 'E', 'E']),
  ],
};

const elementarySocialStudies: Subject = {
  id: 'sub-ss-elem',
  name: 'Social Studies',
  standards: [
    createStandard('ss-elem-1', 'History', ['P', 'P', 'E', 'E']),
    createStandard('ss-elem-2', 'Geography', ['P', 'E', 'E', 'E']),
    createStandard('ss-elem-3', 'Civics', ['E', 'E', 'E', 'E']),
    createStandard('ss-elem-4', 'Economics', ['A', 'P', 'P', 'P']),
  ],
};

const elementaryChinese: Subject = {
  id: 'sub-chn-elem',
  name: 'Chinese Language 中文',
  standards: [
    createStandard('chn-elem-1', 'Reading Comprehension 阅读理解', ['P', 'P', 'E', 'E']),
    createStandard('chn-elem-2', 'Writing 书写', ['A', 'P', 'P', 'E']),
    createStandard('chn-elem-3', 'Speaking 口语', ['P', 'E', 'E', 'E']),
    createStandard('chn-elem-4', 'Listening 听力', ['E', 'E', 'E', 'E']),
  ],
};

const elementaryArts: Subject = {
  id: 'sub-art-elem',
  name: 'Visual Arts',
  standards: [
    createStandard('art-elem-1', 'Creating', ['E', 'E', 'E', 'E']),
    createStandard('art-elem-2', 'Presenting', ['P', 'E', 'E', 'E']),
    createStandard('art-elem-3', 'Responding', ['P', 'P', 'E', 'E']),
  ],
};

const elementaryMusic: Subject = {
  id: 'sub-mus-elem',
  name: 'Music',
  standards: [
    createStandard('mus-elem-1', 'Creating', ['P', 'P', 'E', 'E']),
    createStandard('mus-elem-2', 'Performing', ['P', 'E', 'E', 'E']),
    createStandard('mus-elem-3', 'Responding', ['E', 'E', 'E', 'E']),
  ],
};

const elementaryPE: Subject = {
  id: 'sub-pe-elem',
  name: 'Physical Education',
  standards: [
    createStandard('pe-elem-1', 'Motor Skills', ['E', 'E', 'E', 'E']),
    createStandard('pe-elem-2', 'Fitness', ['P', 'P', 'E', 'E']),
    createStandard('pe-elem-3', 'Personal & Social Behavior', ['E', 'E', 'E', 'E']),
  ],
};

// PK/K 年级使用的学科
const earlyYearsSubjects = [
  languageLiteracy,
  mathScience,
  socialArts,
  socialEmotional,
];

// 小学年级使用的学科
const elementarySubjects = [
  elementaryEnglish,
  elementaryMath,
  elementaryScience,
  elementarySocialStudies,
  elementaryChinese,
  elementaryArts,
  elementaryMusic,
  elementaryPE,
];

export const mockGradesData: Record<string, StudentGrades> = {
  'stu-001': {
    studentId: 'stu-001',
    schoolYear: '2025-2026',
    subjects: elementarySubjects,
  },
  'stu-002': {
    studentId: 'stu-002',
    schoolYear: '2025-2026',
    subjects: elementarySubjects,
  },
};

export function getGradesByStudentId(studentId: string): StudentGrades {
  if (mockGradesData[studentId]) {
    return mockGradesData[studentId];
  }

  // 根据学生年级返回不同的学科设置
  // 这里简化处理，实际应根据学生的gradeLevel判断
  return {
    studentId,
    schoolYear: '2025-2026',
    subjects: elementarySubjects,
  };
}

// 导出早期教育学科供PK/K年级使用
export { earlyYearsSubjects, elementarySubjects };
