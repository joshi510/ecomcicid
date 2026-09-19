import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Placeholder mailer. Replace with SES, Resend, or SMTP before going live.
 * The reset URL is only logged in non-production so tokens never hit prod logs.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  logger.info(
    {
      to,
      template: 'password-reset',
      ...(env.NODE_ENV !== 'production' ? { resetUrl } : {}),
    },
    'Email placeholder: password reset would be sent here',
  );
}
