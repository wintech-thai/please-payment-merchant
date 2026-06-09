import React from 'react'

declare module 'react-qr-code' {
  interface QRCodeProps {
    value: string
    size?: number
    bgColor?: string
    fgColor?: string
    level?: 'L' | 'M' | 'Q' | 'H'
    includeMargin?: boolean
    style?: React.CSSProperties
    viewBox?: string
    title?: string
  }
  const QRCode: React.FC<QRCodeProps>
  export default QRCode
  export { QRCode }
}
