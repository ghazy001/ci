import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private readonly LOGO_URL =
    'https://res.cloudinary.com/dkc5gwry5/image/upload/v1776851284/Design_sans_titre-2_l8jroi.png';

  constructor(private readonly mailerService: MailerService) {}

  async sendUserCredentialsEmail(
    to: string,
    fullName: string,
    email: string,
    password: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject: 'Your account has been created',
      html: `
<div style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">

          <!-- Logo -->
          <tr>
            <td style="background:#ffffff;padding:20px;text-align:center;">
              <img src="${this.LOGO_URL}" alt="Logo" style="height:300px;" />
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0070ad,#00a3e0);padding:30px;text-align:left;color:#ffffff;">
              <h2 style="margin:0;font-size:22px;">Welcome to TestFlow</h2>
              <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">
                Your account has been successfully created
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px;color:#333333;">
              <p style="margin:0 0 16px;font-size:16px;">
                Hello <strong>${fullName}</strong>,
              </p>

              <p style="margin:0 0 16px;font-size:14px;color:#555;">
                You have been added as a <strong style="color:#0070ad;">Tester</strong> on the platform.
                You can now access your account using the credentials below.
              </p>

              <!-- Credentials box -->
              <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin:20px 0;">
                <p style="margin:0 0 8px;font-size:13px;color:#666;">Login details</p>
                <p style="margin:0;font-size:14px;">
                  <strong>Email:</strong> ${email}
                </p>
                <p style="margin:6px 0 0;font-size:14px;">
                  <strong>Password:</strong> ${password}
                </p>
              </div>

              <p style="margin:0;font-size:12px;color:#888;">
                ⚠️ For security reasons, please change your password after your first login.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px;text-align:center;font-size:12px;color:#999;background:#fafafa;">
              © ${new Date().getFullYear()} Capgemini — All rights reserved
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</div>
`,
    });

    this.logger.log(`Credentials email sent to ${to}`);
  }

  async sendPasswordResetEmail(
    to: string,
    fullName: string,
    resetUrl: string,
  ): Promise<void> {
    // Generate expiration time (30 minutes from now)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const expiryText = expiresAt.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    await this.mailerService.sendMail({
      to,
      subject: 'Reset your password',
      html: `
<div style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,0.10);">

          <!-- Logo -->
          <tr>
            <td style="background:#ffffff;padding:20px;text-align:center;">
              <img src="${this.LOGO_URL}" alt="Logo" style="height:300px;" />
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0070ad 0%,#12abdb 100%);padding:32px 36px;color:#ffffff;">
              <h1 style="margin:0;font-size:28px;">Reset your password</h1>
              <p style="margin:10px 0 0;font-size:14px;opacity:0.95;">
                A password reset was requested for your account.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              <p style="font-size:16px;color:#1e293b;">
                Hello <strong>${fullName}</strong>,
              </p>

              <p style="font-size:14px;line-height:1.7;color:#475569;">
                Click the button below to reset your password.
              </p>

              <!-- Countdown-style box -->
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:18px;margin:22px 0;text-align:center;">
                <p style="margin:0 0 8px;font-size:13px;color:#1e40af;font-weight:700;">
                  ⏳ Link expires in
                </p>

                <div style="font-size:28px;font-weight:800;color:#0070ad;letter-spacing:1px;">
                  30:00
                </div>

                <p style="margin:8px 0 0;font-size:12px;color:#64748b;">
                  Until <strong>${expiryText}</strong>
                </p>
              </div>

              <!-- Button -->
              <div style="margin:28px 0;">
                <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#0070ad 0%,#12abdb 100%);color:#fff;text-decoration:none;border-radius:999px;font-weight:700;">
                  Reset password
                </a>
              </div>

              <p style="font-size:13px;color:#64748b;">
                If you did not request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</div>
`,
    });

    this.logger.log(`Password reset email sent to ${to}`);
  }
}
