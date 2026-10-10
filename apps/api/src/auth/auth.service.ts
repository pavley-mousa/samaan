import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole, UserStatus } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
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
