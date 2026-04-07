export class PdfValidationError extends Error {
  constructor(
    message: string,
    public readonly code: "MISSING_FIELD" | "INVALID_DATA" | "CERTIFICATE_BLOCKED" | "SCHEDULE_NOT_APPLICABLE"
  ) {
    super(message)
    this.name = "PdfValidationError"
  }
}
