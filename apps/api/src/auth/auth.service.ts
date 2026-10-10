import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole, UserStatus } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.module';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailService } from './mail.service';

const TOKEN_TTL_MS = 30 * 60 * 1000;
const PASSWORD_COST = 12;
type PublicUser = Pick<User, 'id' | 'name' | 'firstName' | 'lastName' | 'email' | 'phone' | 'role' | 'status' | 'emailVerifiedAt' | 'createdAt'>;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly mail: MailService) {}

  private publicUser(user: User): PublicUser {
    const { id, name, firstName, lastName, email, phone, role, status, emailVerifiedAt, createdAt } = user;
    return { id, name, firstName, lastName, email, phone, role, status, emailVerifiedAt, createdAt };
  }

  private digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueSession(user: User): Promise<{ user: PublicUser; accessToken: string }> {
    const accessToken = await this.jwt.signAsync({ sub: user.id, sv: user.sessionVersion });
    return { user: this.publicUser(user), accessToken };
  }

  async register(dto: RegisterDto): Promise<{ message: string; verificationToken?: string }> {
    const firstName = dto.firstName?.trim() || null;
    const lastName = dto.lastName?.trim() || null;
    if ((firstName && !lastName) || (!firstName && lastName)) {
      throw new BadRequestException('اكتب الاسم الأول واسم العائلة معًا.');
    }
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : dto.name?.trim();
    if (!fullName || fullName.length < 2 || fullName.length > 120) {
      throw new BadRequestException('الاسم الأول واسم العائلة مطلوبان لإنشاء الحساب.');
    }
    if (Buffer.byteLength(dto.password, 'utf8') > 72) {
      throw new BadRequestException('كلمة المرور طويلة جدًا. استخدم كلمة مرور لا تتجاوز 72 بايتًا.');
    }
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) throw new BadRequestException('تعذر إنشاء الحساب بهذا البريد. جرّب تسجيل الدخول أو استعادة كلمة المرور.');

    const rawToken = randomBytes(32).toString('base64url');
    const passwordHash = await hash(dto.password, PASSWORD_COST);
    const user = await this.prisma.user.create({
      data: {
        name: fullName,
        firstName,
        lastName,
        email,
        phone: dto.phone?.trim() || null,
        passwordHash,
        role: UserRole.CUSTOMER,
        status: UserStatus.PENDING_VERIFICATION,
        emailVerification: { create: { tokenHash: this.digest(rawToken), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) } },
      },
    });

    try {
      const sent = await this.mail.sendVerificationEmail(user.email, rawToken);
      if (!sent) {
        // Development-only verification helper. Never return verification tokens in production.
        return { message: 'تم إنشاء الحساب. استخدم رمز التطوير لتأكيد البريد.', verificationToken: rawToken };
      }
    } catch (error) {
      // Avoid leaving an unusable pending account if SMTP fails before the verification link is delivered.
      await this.prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw error;
    }
    return { message: 'تم إنشاء الحساب. راجع بريدك الإلكتروني لتأكيده.' };
  }

  async verifyEmail(token: string): Promise<{ user: PublicUser; accessToken: string }> {
    const tokenHash = this.digest(token);
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!record || record.expiresAt <= new Date() || record.user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('رمز التحقق غير صالح أو انتهت صلاحيته.');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.delete({ where: { id: record.id } });
      return tx.user.update({
        where: { id: record.userId },
        data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
      });
    });
    return this.issueSession(user);
  }


  private otpDigest(email: string, code: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new ServiceUnavailableException('خدمة التحقق غير متاحة حاليًا.');
    return createHmac('sha256', secret).update(email + ':' + code).digest('hex');
  }

  async loginWithGoogle(credential: string): Promise<{ user: PublicUser; accessToken: string }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new ServiceUnavailableException('تسجيل Google يحتاج إلى إكمال الإعداد من إدارة الموقع.');
    if (typeof credential !== 'string' || credential.length < 100 || credential.length > 8192 || credential.split('.').length !== 3) {
      throw new UnauthorizedException('بيانات تسجيل Google غير صالحة.');
    }
    let response: Response;
    try {
      response = await fetch('https://oauth2.googleapis.com/tokeninfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ id_token: credential }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new ServiceUnavailableException('تعذر الاتصال بخدمة Google. حاول مرة أخرى.');
    }
    if (!response.ok) throw new UnauthorizedException('انتهت صلاحية تسجيل Google أو أن بياناته غير صحيحة.');
    let claims: Record<string, unknown>;
    try {
      claims = await response.json() as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException('تعذر التحقق من حساب Google.');
    }
    const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
    const googleId = typeof claims.sub === 'string' ? claims.sub : '';
    const expiration = Number(claims.exp);
    const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
    const hostedDomain = typeof claims.hd === 'string' ? claims.hd.trim() : '';
    const issuerOk = claims.iss === 'accounts.google.com' || claims.iss === 'https://accounts.google.com';
    if (claims.aud !== clientId || !issuerOk || !Number.isFinite(expiration) || expiration * 1000 <= Date.now() || !googleId || !email || !emailVerified) {
      throw new UnauthorizedException('تعذر التحقق من حساب Google. حاول تسجيل الدخول مرة أخرى.');
    }
    // Google's guidance treats Gmail and verified Google Workspace addresses as authoritative.
    if (!email.endsWith('@gmail.com') && !hostedDomain) {
      throw new BadRequestException('لأمان حسابك، استخدم رمز OTP لتأكيد هذا البريد الإلكتروني بدلًا من ربطه مباشرة بحساب Google.');
    }
    const displayName = typeof claims.name === 'string' ? claims.name.trim() : '';
    const nameParts = displayName.split(/\s+/).filter(Boolean);
    const firstName = (typeof claims.given_name === 'string' ? claims.given_name : nameParts[0] || email.split('@')[0]).trim().slice(0, 60);
    const lastName = (typeof claims.family_name === 'string' ? claims.family_name : nameParts.slice(1).join(' ') || 'Samaan').trim().slice(0, 60);
    const fullName = (firstName + ' ' + lastName).slice(0, 120);
    const now = new Date();

    const googleUser = await this.prisma.user.findUnique({ where: { googleId } });
    if (googleUser) {
      if (googleUser.status === UserStatus.SUSPENDED) throw new UnauthorizedException('الحساب غير متاح حاليًا. تواصل مع إدارة المتجر.');
      const activeUser = googleUser.status === UserStatus.ACTIVE && googleUser.emailVerifiedAt
        ? googleUser
        : await this.prisma.user.update({
            where: { id: googleUser.id },
            data: { status: UserStatus.ACTIVE, emailVerifiedAt: googleUser.emailVerifiedAt ?? now },
          });
      return this.issueSession(activeUser);
    }

    const emailUser = await this.prisma.user.findUnique({ where: { email } });
    if (emailUser) {
      if (emailUser.status === UserStatus.SUSPENDED) throw new UnauthorizedException('الحساب غير متاح حاليًا. تواصل مع إدارة المتجر.');
      if (emailUser.googleId && emailUser.googleId !== googleId) {
        throw new UnauthorizedException('هذا البريد مرتبط بحساب Google آخر. استخدم طريقة الدخول المعتادة.');
      }
      const linkedUser = await this.prisma.user.update({
        where: { id: emailUser.id },
        data: {
          googleId,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: emailUser.emailVerifiedAt ?? now,
          firstName: emailUser.firstName ?? firstName,
          lastName: emailUser.lastName ?? lastName,
          name: (!emailUser.firstName || !emailUser.lastName)
            ? ((emailUser.firstName ?? firstName) + ' ' + (emailUser.lastName ?? lastName)).slice(0, 120)
            : emailUser.name,
        },
      });
      return this.issueSession(linkedUser);
    }

    const passwordHash = await hash(randomBytes(32).toString('hex'), PASSWORD_COST);
    const user = await this.prisma.user.create({
      data: { name: fullName, firstName, lastName, email, googleId, passwordHash, role: UserRole.CUSTOMER, status: UserStatus.ACTIVE, emailVerifiedAt: now },
    });
    return this.issueSession(user);
  }

  async requestEmailOtp(input: { email: string; firstName?: string; lastName?: string; phone?: string }): Promise<{ message: string; debugCode?: string }> {
    const email = input.email.trim().toLowerCase();
    const firstName = input.firstName?.trim() || null;
    const lastName = input.lastName?.trim() || null;
    const phone = input.phone?.trim() || null;
    if ((firstName && !lastName) || (!firstName && lastName)) throw new BadRequestException('اكتب الاسم الأول واسم العائلة معًا.');

    const existing = await this.prisma.user.findUnique({ where: { email } });
    const genericMessage = 'لو كان البريد الإلكتروني متاحًا، هيوصلك رمز تحقق من 6 أرقام. الرمز صالح لمدة 10 دقائق.';
    if (existing?.status === UserStatus.SUSPENDED) return { message: genericMessage };
    if (!existing && (!firstName || !lastName)) throw new BadRequestException('لإنشاء حساب جديد برمز OTP، اكتب الاسم الأول واسم العائلة.');

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = this.otpDigest(email, code);
    await this.prisma.emailOtp.upsert({
      where: { email },
      create: { email, codeHash, firstName, lastName, phone, expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0 },
      update: { codeHash, firstName, lastName, phone, expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0, createdAt: new Date() },
    });

    try {
      const sent = await this.mail.sendEmailOtp(email, code);
      if (!sent) return { message: 'رمز تحقق للتجربة المحلية فقط. في الإنتاج سيصلك الرمز على البريد الإلكتروني.', debugCode: code };
    } catch (error) {
      await this.prisma.emailOtp.deleteMany({ where: { email, codeHash } }).catch(() => undefined);
      throw error;
    }
    return { message: genericMessage };
  }

  async verifyEmailOtp(emailInput: string, code: string): Promise<{ user: PublicUser; accessToken: string }> {
    const email = emailInput.trim().toLowerCase();
    const record = await this.prisma.emailOtp.findUnique({ where: { email } });
    const now = new Date();
    if (!record || record.expiresAt <= now) {
      await this.prisma.emailOtp.deleteMany({ where: { email } }).catch(() => undefined);
      throw new BadRequestException('رمز التحقق غير صالح أو انتهت صلاحيته. اطلب رمزًا جديدًا.');
    }
    if (record.attempts >= 5) {
      await this.prisma.emailOtp.deleteMany({ where: { id: record.id } });
      throw new BadRequestException('تجاوزت عدد المحاولات المسموح. اطلب رمزًا جديدًا.');
    }

    const expectedHash = this.otpDigest(email, code);
    if (record.codeHash !== expectedHash) {
      const nextAttempts = record.attempts + 1;
      if (nextAttempts >= 5) await this.prisma.emailOtp.deleteMany({ where: { id: record.id } });
      else {
        await this.prisma.emailOtp.updateMany({
          where: { id: record.id, attempts: record.attempts, codeHash: record.codeHash },
          data: { attempts: { increment: 1 } },
        });
      }
      throw new UnauthorizedException('رمز التحقق غير صحيح.');
    }

    const precheckedUser = await this.prisma.user.findUnique({ where: { email } });
    if (precheckedUser?.status === UserStatus.SUSPENDED) {
      await this.prisma.emailOtp.deleteMany({ where: { id: record.id } });
      throw new UnauthorizedException('الحساب غير متاح حاليًا. تواصل مع إدارة المتجر.');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.emailOtp.deleteMany({
        where: { id: record.id, codeHash: expectedHash, expiresAt: { gt: new Date() }, attempts: { lt: 5 } },
      });
      if (consumed.count !== 1) throw new BadRequestException('تم استخدام الرمز أو انتهت صلاحيته. اطلب رمزًا جديدًا.');

      const account = await tx.user.findUnique({ where: { email } });
      if (account) {
        if (account.status === UserStatus.SUSPENDED) throw new UnauthorizedException('الحساب غير متاح حاليًا. تواصل مع إدارة المتجر.');
        if (account.status === UserStatus.PENDING_VERIFICATION || !account.emailVerifiedAt) {
          return tx.user.update({
            where: { id: account.id },
            data: { status: UserStatus.ACTIVE, emailVerifiedAt: account.emailVerifiedAt ?? new Date() },
          });
        }
        return account;
      }

      if (!record.firstName || !record.lastName) throw new BadRequestException('لإنشاء حساب جديد، اكتب الاسم الأول واسم العائلة واطلب رمزًا جديدًا.');
      const passwordHash = await hash(randomBytes(32).toString('hex'), PASSWORD_COST);
      return tx.user.create({
        data: {
          name: (record.firstName + ' ' + record.lastName).slice(0, 120),
          firstName: record.firstName,
          lastName: record.lastName,
          email,
          phone: record.phone,
          passwordHash,
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      });
    });
    return this.issueSession(user);
  }

  async requestPasswordReset(emailInput: string): Promise<{ message: string }> {
    const genericResponse = {
      message: 'لو البريد الإلكتروني مسجل ونشط، هيوصلك رابط استعادة كلمة المرور. راجع الوارد والبريد غير الهام.',
    };
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, status: true },
    });
    if (!user || user.status !== UserStatus.ACTIVE) return genericResponse;

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.digest(rawToken);
    await this.prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
      update: {
        tokenHash,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        createdAt: new Date(),
      },
    });

    try {
      await this.mail.sendPasswordResetEmail(user.email, rawToken);
    } catch {
      // Keep responses generic and remove the unusable token if delivery fails.
      await this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, tokenHash },
      }).catch(() => undefined);
      console.error('Password reset email delivery failed.');
    }
    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      throw new BadRequestException('كلمة المرور طويلة جدًا. استخدم كلمة مرور لا تتجاوز 72 بايتًا.');
    }

    const tokenHash = this.digest(token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.expiresAt <= new Date() || record.user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('رابط استعادة كلمة المرور غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.');
    }

    const passwordHash = await hash(newPassword, PASSWORD_COST);
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.deleteMany({
        where: { id: record.id, tokenHash, expiresAt: { gt: new Date() } },
      });
      if (consumed.count !== 1) {
        throw new BadRequestException('رابط استعادة كلمة المرور غير صالح أو استُخدم من قبل.');
      }
      await tx.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          sessionVersion: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    });
    return { message: 'تم تغيير كلمة المرور بنجاح. سجّل الدخول من جديد على أجهزتك.' };
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser; accessToken: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    }
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('أكد بريدك الإلكتروني أولًا قبل تسجيل الدخول.');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('الحساب غير متاح حاليًا. تواصل مع إدارة المتجر.');
    }
    return this.issueSession(user);
  }

  async findActiveUser(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('الجلسة غير صالحة. سجّل الدخول مرة أخرى.');
    return this.publicUser(user);
  }

  async verifySessionToken(token: string): Promise<string> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; sv: number }>(token);
      if (!payload.sub || !Number.isInteger(payload.sv)) throw new Error('Invalid session payload');
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { sessionVersion: true },
      });
      if (!user || user.sessionVersion !== payload.sv) throw new Error('Session has been revoked');
      return payload.sub;
    } catch {
      throw new UnauthorizedException('الجلسة انتهت أو تم إلغاؤها. سجّل الدخول من جديد.');
    }
  }
}
