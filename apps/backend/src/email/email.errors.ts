export class EmailSendError extends Error {
  constructor(
    public readonly recipient: string,
    cause: string,
  ) {
    super(`Failed to send email to ${recipient}: ${cause}`);
    this.name = 'EmailSendError';
  }
}
