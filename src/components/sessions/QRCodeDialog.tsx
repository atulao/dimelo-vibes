import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Session {
  id: string;
  title: string;
}

interface QRCodeDialogProps {
  session: Session | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QRCodeDialog = ({ session, open, onOpenChange }: QRCodeDialogProps) => {
  if (!session) return null;

  const sessionUrl = `${window.location.origin}/session/${session.id}`;

  const downloadQRCode = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `qr-${session.id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session QR Code</DialogTitle>
          <DialogDescription>{session.title}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              id="qr-code-svg"
              value={sessionUrl}
              size={256}
              level="H"
              includeMargin
            />
          </div>
          <p className="text-sm text-muted-foreground text-center break-all">
            {sessionUrl}
          </p>
          <Button onClick={downloadQRCode} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
