export class LocalSignatureError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "LocalSignatureError"
    this.status = status
  }
}
