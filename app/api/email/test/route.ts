/**
 * 测试邮件发送API
 * 使用配置的SMTP设置发送测试邮件
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository } from '@/lib/database/repositories';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email address is required' },
        { status: 400 }
      );
    }

    // 获取SMTP配置
    const smtpConfig = await settingsRepository.getSMTPConfig();

    if (!smtpConfig.host || !smtpConfig.username || !smtpConfig.password) {
      return NextResponse.json(
        { error: 'SMTP settings are incomplete. Please configure host, username and password.' },
        { status: 400 }
      );
    }

    // 创建邮件传输器
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port || 587,
      secure: smtpConfig.secure, // true for 465, false for other ports
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    });

    // 发送测试邮件
    const info = await transporter.sendMail({
      from: `"${smtpConfig.fromName || 'Report Card System'}" <${smtpConfig.fromEmail || smtpConfig.username}>`,
      to: to,
      subject: 'Test Email from Report Card System',
      text: 'This is a test email from the Report Card System. If you received this email, your SMTP configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2E1A4A;">Test Email</h2>
          <p>This is a test email from the <strong>Report Card System</strong>.</p>
          <p>If you received this email, your SMTP configuration is working correctly.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Sent from: ${smtpConfig.fromEmail || smtpConfig.username}<br>
            SMTP Host: ${smtpConfig.host}<br>
            Time: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    });

    console.log('Test email sent:', info.messageId);

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
    });

  } catch (error) {
    console.error('Failed to send test email:', error);
    
    // 提供更详细的错误信息
    let errorMessage = 'Failed to send test email';
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused. Please check your SMTP host and port.';
      } else if (error.message.includes('EAUTH') || error.message.includes('Invalid login')) {
        errorMessage = 'Authentication failed. Please check your username and password.';
      } else if (error.message.includes('ETIMEDOUT')) {
        errorMessage = 'Connection timed out. Please check your SMTP host and port.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
