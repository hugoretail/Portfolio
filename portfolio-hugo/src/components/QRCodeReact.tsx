import { QRCodeCanvas } from 'qrcode.react';

type Props = {
  url: string;
  size?: number;
};

export function QRCodeReact({ url, size = 180 }: Props) {
  return (
    <QRCodeCanvas
      value={url}
      size={size}
      bgColor="rgba(0,0,0,0)"
      fgColor="#0b0b0b"
      includeMargin={true}
      level="M"
    />
  );
}
