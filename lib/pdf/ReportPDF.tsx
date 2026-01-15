/**
 * 使用 @react-pdf/renderer 生成PDF的报告组件
 */

import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import path from 'path';
import type { ReportData, ScoreLevel } from '@/types';
import { SCORE_DEFINITIONS } from '@/types/grade';
import { getGradeLevelName } from '@/lib/config/grade.config';

// 注册思源黑体（支持中文）
const fontPath = path.join(process.cwd(), 'public', 'fonts');

Font.register({
  family: 'SourceHanSans',
  fonts: [
    {
      src: path.join(fontPath, 'SourceHanSansSC-Regular.otf'),
      fontWeight: 'normal',
    },
    {
      src: path.join(fontPath, 'SourceHanSansSC-Bold.otf'),
      fontWeight: 'bold',
    },
  ],
});

// 禁用连字符（避免中文换行问题）
Font.registerHyphenationCallback((word) => [word]);

// 定义主题色
const colors = {
  primary: '#6b2d5b',
  primaryLight: '#8b3d75',
  primaryBg: '#f5eaf3',
  primaryBorder: '#dbb3d3',
  white: '#ffffff',
  gray: '#64748b',
  darkGray: '#334155',
  lightGray: '#f1f5f9',
  emerald: '#059669',
  emeraldBg: '#d1fae5',
  amber: '#d97706',
  amberBg: '#fef3c7',
  red: '#dc2626',
  redBg: '#fee2e2',
};

// 定义样式
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'SourceHanSans',
    backgroundColor: colors.white,
  },
  // Header styles
  headerWrapper: {
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    marginBottom: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  schoolName: {
    textAlign: 'left',
  },
  schoolTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  schoolTitleChinese: {
    fontSize: 9,
    color: colors.primaryLight,
    marginTop: 2,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d1226',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 0,
  },
  // Student info styles
  studentInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    width: '48%',
    marginBottom: 4,
  },
  infoLabel: {
    fontWeight: 'bold',
    color: colors.darkGray,
    width: 80,
  },
  infoValue: {
    color: colors.darkGray,
    flex: 1,
  },
  // Table styles
  table: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primaryBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryBorder,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ebd5e7',
  },
  tableRowAlt: {
    backgroundColor: '#faf5f9',
  },
  tableCell: {
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: colors.primaryBorder,
  },
  tableCellLast: {
    borderRightWidth: 0,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    fontSize: 9,
  },
  // Attendance styles
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 6,
  },
  attendanceCell: {
    width: 60,
    textAlign: 'center',
  },
  attendanceLabelCell: {
    width: 280,
    backgroundColor: '#faf5f9',
  },
  // Assessment key styles
  assessmentKey: {
    marginBottom: 12,
  },
  assessmentRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ebd5e7',
  },
  assessmentScore: {
    width: 30,
    padding: 4,
    backgroundColor: colors.primaryBg,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.primaryBorder,
  },
  assessmentDesc: {
    flex: 1,
    padding: 4,
    fontSize: 8,
    color: colors.gray,
  },
  assessmentLabel: {
    fontWeight: 'bold',
    color: '#5a274c',
  },
  // Subject grades styles
  subjectTable: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 4,
  },
  subjectHeader: {
    flex: 1,
    padding: 6,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'left',
  },
  quarterCell: {
    width: 35,
    padding: 6,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.primaryBorder,
  },
  standardName: {
    flex: 1,
    padding: 4,
    fontSize: 8,
    color: colors.darkGray,
    borderRightWidth: 1,
    borderRightColor: '#ebd5e7',
  },
  scoreCell: {
    width: 35,
    padding: 4,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ebd5e7',
  },
  // Score badge styles
  scoreBadge: {
    fontSize: 8,
    fontWeight: 'bold',
    padding: 2,
    borderRadius: 2,
    textAlign: 'center',
  },
  scoreE: {
    backgroundColor: colors.emeraldBg,
    color: colors.emerald,
  },
  scoreP: {
    backgroundColor: colors.primaryBg,
    color: colors.primary,
  },
  scoreA: {
    backgroundColor: colors.amberBg,
    color: colors.amber,
  },
  scoreN: {
    backgroundColor: colors.redBg,
    color: colors.red,
  },
  scoreDash: {
    backgroundColor: colors.lightGray,
    color: colors.gray,
  },
  // Footer styles
  footer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  signatureArea: {
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  signatureBox: {
    width: 180,
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryLight,
    marginBottom: 5,
  },
  signatureImage: {
    height: 40,
    marginBottom: 5,
    objectFit: 'contain',
  },
  signatureName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.darkGray,
  },
  signatureTitle: {
    fontSize: 9,
    color: colors.primary,
  },
  schoolContact: {
    textAlign: 'center',
    fontSize: 8,
    color: colors.primaryLight,
  },
});

// Score badge 样式映射
const getScoreStyle = (score: ScoreLevel) => {
  switch (score) {
    case 'E':
      return styles.scoreE;
    case 'P':
      return styles.scoreP;
    case 'A':
      return styles.scoreA;
    case 'N':
      return styles.scoreN;
    default:
      return styles.scoreDash;
  }
};

interface ReportPDFProps {
  data: ReportData;
  logoUrl?: string;  // Base64编码的logo图片或远程URL
}

export function ReportPDF({ data, logoUrl }: ReportPDFProps) {
  const { student, schoolYear, schoolInfo, attendance, grades, signature } = data;

  const currentDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  });

  const principalName = signature?.principalName || schoolInfo.principalName || '';
  const principalTitle = signature?.principalTitle || schoolInfo.principalTitle || 'Principal';

  const assessmentScores: ScoreLevel[] = ['E', 'P', 'A', 'N', '-'];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerWrapper}>
          <View style={styles.header}>
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
            <View style={styles.schoolName}>
              <Text style={styles.schoolTitle}>GTIIT AFFILIATED</Text>
              <Text style={styles.schoolTitle}>INTERNATIONAL SCHOOL</Text>
              {schoolInfo.nameChinese && (
                <Text style={styles.schoolTitleChinese}>{schoolInfo.nameChinese}</Text>
              )}
            </View>
          </View>
          <Text style={styles.reportTitle}>Student Progress Report</Text>
        </View>

        {/* Student Info */}
        <View style={styles.studentInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>
              {student.firstName} {student.lastName}
              {student.chineseName && ` (${student.chineseName})`}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{currentDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Grade Level:</Text>
            <Text style={styles.infoValue}>{getGradeLevelName(student.gradeLevel)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Year:</Text>
            <Text style={styles.infoValue}>{schoolYear}</Text>
          </View>
        </View>

        {/* Attendance */}
        <View style={styles.table} wrap={false}>
          <View style={styles.tableHeader} wrap={false}>
            <View style={[styles.tableCell, styles.attendanceLabelCell]}>
              <Text style={styles.tableHeaderText}></Text>
            </View>
            {attendance.quarters.map((q, i) => (
              <View 
                key={q.quarter} 
                style={[
                  styles.tableCell, 
                  styles.attendanceCell,
                  ...(i === attendance.quarters.length - 1 ? [styles.tableCellLast] : []),
                ]}
              >
                <Text style={styles.tableHeaderText}>{q.quarter}</Text>
              </View>
            ))}
          </View>
          <View style={styles.tableRow} wrap={false}>
            <View style={[styles.tableCell, styles.attendanceLabelCell]}>
              <Text style={{ fontWeight: 'bold', color: colors.primary }}>Absent</Text>
            </View>
            {attendance.quarters.map((q, i) => (
              <View
                key={`absent-${q.quarter}`}
                style={[
                  styles.tableCell,
                  styles.attendanceCell,
                  ...(i === attendance.quarters.length - 1 ? [styles.tableCellLast] : []),
                ]}
              >
                <Text style={{ textAlign: 'center' }}>{q.absent}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]} wrap={false}>
            <View style={[styles.tableCell, styles.attendanceLabelCell]}>
              <Text style={{ fontWeight: 'bold', color: colors.primary }}>Tardy</Text>
            </View>
            {attendance.quarters.map((q, i) => (
              <View
                key={`tardy-${q.quarter}`}
                style={[
                  styles.tableCell,
                  styles.attendanceCell,
                  ...(i === attendance.quarters.length - 1 ? [styles.tableCellLast] : []),
                ]}
              >
                <Text style={{ textAlign: 'center' }}>{q.tardy}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Assessment Key */}
        <View style={styles.assessmentKey} wrap={false}>
          <Text style={styles.sectionTitle}>Assessment Key</Text>
          <View style={styles.table}>
            {assessmentScores.map((score, i) => (
              <View
                key={score}
                style={[
                  styles.assessmentRow,
                  ...(i === assessmentScores.length - 1 ? [{ borderBottomWidth: 0 }] : []),
                ]}
                wrap={false}
              >
                <Text style={styles.assessmentScore}>{score}</Text>
                <Text style={styles.assessmentDesc}>
                  <Text style={styles.assessmentLabel}>{SCORE_DEFINITIONS[score].label}: </Text>
                  {SCORE_DEFINITIONS[score].description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Subject Grades */}
        <Text style={styles.sectionTitle}>Student Progress Report</Text>
        {grades.subjects.map((subject) => (
          <View key={subject.id} style={styles.subjectTable}>
            <View style={styles.tableHeader} wrap={false}>
              <Text style={styles.subjectHeader}>{subject.name}</Text>
              <View style={styles.quarterCell}>
                <Text style={styles.tableHeaderText}>Q1</Text>
              </View>
              <View style={styles.quarterCell}>
                <Text style={styles.tableHeaderText}>Q2</Text>
              </View>
              <View style={styles.quarterCell}>
                <Text style={styles.tableHeaderText}>Q3</Text>
              </View>
              <View style={[styles.quarterCell, styles.tableCellLast]}>
                <Text style={styles.tableHeaderText}>Q4</Text>
              </View>
            </View>
            {subject.standards.map((standard, idx) => (
              <View
                key={standard.id}
                style={[
                  styles.tableRow,
                  ...(idx % 2 === 1 ? [styles.tableRowAlt] : []),
                  ...(idx === subject.standards.length - 1 ? [{ borderBottomWidth: 0 }] : []),
                ]}
                wrap={false}
              >
                <Text style={styles.standardName}>{standard.name}</Text>
                {standard.quarterScores.map((qs, i) => (
                  <View
                    key={qs.quarter}
                    style={[
                      styles.scoreCell,
                      ...(i === standard.quarterScores.length - 1 ? [styles.tableCellLast] : []),
                    ]}
                  >
                    <Text style={[styles.scoreBadge, getScoreStyle(qs.score)]}>{qs.score}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.signatureArea}>
            <View style={styles.signatureBox}>
              {signature?.signatureImageUrl ? (
                <Image src={signature.signatureImageUrl} style={styles.signatureImage} />
              ) : (
                <View style={styles.signatureLine} />
              )}
              {principalName && <Text style={styles.signatureName}>{principalName}</Text>}
              <Text style={styles.signatureTitle}>{principalTitle}</Text>
            </View>
          </View>
          <View style={styles.schoolContact}>
            <Text>{schoolInfo.address}</Text>
            <Text>
              Tel: {schoolInfo.phone} | Email: {schoolInfo.email}
            </Text>
            {schoolInfo.website && <Text>{schoolInfo.website}</Text>}
          </View>
        </View>
      </Page>
    </Document>
  );
}
