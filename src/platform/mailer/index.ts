export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface Mailer {
  send(input: SendEmailInput): Promise<void>;
}

/** Default driver — logs instead of sending. Safe fallback until a real MAIL_DRIVER is configured. */
export class NoopMailer implements Mailer {
  constructor(private readonly logger: { info: (msg: string, obj?: unknown) => void }) {}

  async send(input: SendEmailInput): Promise<void> {
    this.logger.info("noop-mailer: would send email", {
      to: input.to,
      subject: input.subject,
    });
  }
}

// Sprint 9 adds ResendMailer / SesMailer implementing the same interface,
// selected by MAIL_DRIVER — no caller changes when the driver changes.
