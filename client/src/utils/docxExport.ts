import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, VerticalAlign } from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export interface DocxExportData {
  title: string;
  code: string;
  date: string;
  partnerName: string; // Tên khách hàng / Nhà cung cấp
  partnerAddress?: string;
  partnerPhone?: string;
  vehicleNo?: string;
  driverName?: string;
  note?: string;
  lines: {
    stt: number;
    itemName: string;
    unit: string;
    quantity: number;
    condition?: string;
  }[];
  isReceipt: boolean;
}

export const exportToDocx = async (data: DocxExportData) => {
  const tableHeader = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ text: "STT", alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER }),
      new TableCell({ children: [new Paragraph({ text: "Tên vật tư / Sản phẩm", alignment: AlignmentType.CENTER })], width: { size: 50, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER }),
      new TableCell({ children: [new Paragraph({ text: "ĐVT", alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER }),
      new TableCell({ children: [new Paragraph({ text: "Số lượng", alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER }),
      new TableCell({ children: [new Paragraph({ text: "Tình trạng", alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER }),
    ],
  });

  const tableRows = data.lines.map(line => new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ text: line.stt.toString(), alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ text: line.itemName })] }),
      new TableCell({ children: [new Paragraph({ text: line.unit || '-', alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ text: line.quantity.toString(), alignment: AlignmentType.CENTER })] }),
      new TableCell({ children: [new Paragraph({ text: line.condition || '-', alignment: AlignmentType.CENTER })] }),
    ],
  }));

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Header Công ty
        new Paragraph({
          children: [
            new TextRun({ text: "CÔNG TY TNHH DAFA GLASS", bold: true, size: 24 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Địa chỉ: Khu công nghiệp, Hà Nội", size: 20 }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Điện thoại: 0123.456.789", size: 20 }),
          ],
          spacing: { after: 400 },
        }),

        // Tiêu đề
        new Paragraph({
          children: [
            new TextRun({ text: "BIÊN BẢN BÀN GIAO HÀNG HÓA", bold: true, size: 32 }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `(${data.title})`, italics: true, size: 24 }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),

        // Thông tin chung
        new Paragraph({ children: [new TextRun({ text: `Mã phiếu: `, bold: true }), new TextRun(data.code)] }),
        new Paragraph({ children: [new TextRun({ text: `Ngày bàn giao: `, bold: true }), new TextRun(data.date)] }),
        new Paragraph({ children: [new TextRun({ text: data.isReceipt ? `Bên giao (Nhà cung cấp): ` : `Bên nhận (Khách hàng): `, bold: true }), new TextRun(data.partnerName || "................................................")] }),
        new Paragraph({ children: [new TextRun({ text: `Người vận chuyển/Tài xế: `, bold: true }), new TextRun(data.driverName || "................................................")] }),
        new Paragraph({ children: [new TextRun({ text: `Biển số xe: `, bold: true }), new TextRun(data.vehicleNo || "................................................")] }),
        new Paragraph({ children: [new TextRun({ text: `Ghi chú: `, bold: true }), new TextRun(data.note || "................................................")] }),
        new Paragraph({ text: "", spacing: { after: 200 } }), // blank line

        // Lời dẫn
        new Paragraph({
          children: [
            new TextRun({ text: "Hai bên cùng thống nhất bàn giao/nghiệm thu số lượng hàng hóa chi tiết như sau:" }),
          ],
          spacing: { after: 200 },
        }),

        // Bảng chi tiết
        new Table({
          rows: [tableHeader, ...tableRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),

        new Paragraph({ text: "", spacing: { after: 400 } }), // blank line

        // Chữ ký
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: data.isReceipt ? "ĐẠI DIỆN BÊN GIAO" : "ĐẠI DIỆN BÊN NHẬN", bold: true })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", italics: true })], alignment: AlignmentType.CENTER }),
                  ],
                  width: { size: 33, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "NGƯỜI VẬN CHUYỂN", bold: true })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", italics: true })], alignment: AlignmentType.CENTER }),
                  ],
                  width: { size: 33, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "ĐẠI DIỆN KHO DAFA", bold: true })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", italics: true })], alignment: AlignmentType.CENTER }),
                  ],
                  width: { size: 34, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
          ],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Bien_Ban_Ban_Giao_${data.code}.docx`);
};
