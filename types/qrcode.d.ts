declare module "qrcode" {
  interface QRCodeToDataURLOptions {
    width?: number
    margin?: number
    errorCorrectionLevel?: "L" | "M" | "Q" | "H"
  }
  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>
}
