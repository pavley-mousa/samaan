import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    const host = process.env.SMTP_HOST;
    const from = process.env.SMTP_FROM;
    if (!host || !from) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('Email verification is temporarily unavailable.');
      }
      return false;
    }

    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = String(process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true';
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' } : undefined,
    });
    const verifyUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/verify-email?token=${encodeURIComponent(token)}`;
    await transporter.sendMail({
      from,
      to: email,
      subject: 'تأكيد البريد الإلكتروني — Samaan',
      text: `لتأكيد بريدك الإلكتروني، افتح الرابط التالي: ${verifyUrl}\\nإذا لم تنشئ الحساب، تجاهل هذه الرسالة.`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif"><h2>تأكيد البريد الإلكتروني</h2><p>اضغط على الرابط لتأكيد حسابك:</p><p><a href="${verifyUrl}">تأكيد البريد الإلكتروني</a></p><p>ينتهي الرابط خلال 30 دقيقة.</p></div>`,
    });
    return true;
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const host = process.env.SMTP_HOST;
    const from = process.env.SMTP_FROM;
    if (!host || !from) {
      throw new ServiceUnavailableException('Password reset email is not configured.');
    }

    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = String(process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true';
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' } : undefined,
    });
    const resetUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/reset-password?token=${encodeURIComponent(token)}`;
    await transporter.sendMail({
      from,
      to: email,
      subject: 'استعادة كلمة المرور — Samaan',
      text: `لاستعادة كلمة مرور حسابك، افتح الرابط التالي خلال 30 دقيقة: ${resetUrl}\\nإذا لم تطلب الاستعادة، تجاهل هذه الرسالة.`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif"><h2>استعادة كلمة المرور</h2><p>افتح الرابط التالي لتعيين كلمة مرور جديدة:</p><p><a href="${resetUrl}">استعادة كلمة المرور</a></p><p>ينتهي الرابط خلال 30 دقيقة، ويُستخدم مرة واحدة فقط.</p><p>إذا لم تطلب الاستعادة، يمكنك تجاهل الرسالة.</p></div>`,
    });
  }
}
