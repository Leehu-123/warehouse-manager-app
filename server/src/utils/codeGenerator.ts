import { prisma } from '../index';

const GLASS_TYPE_MAP: Record<string, string> = {
  kinh_thuong: 'KT',
  kinh_cuong_luc: 'KCL',
  kinh_dan: 'KD',
  kinh_hop: 'KH',
  kinh_phan_quang: 'KPQ',
  kinh_mau: 'KM',
  kinh_low_e: 'KLE',
  khac: 'K',
};

const COLOR_MAP: Record<string, string> = {
  trang: 'TR',
  xanh: 'XD',
  tra: 'TRA',
  xam: 'XAM',
  den: 'DEN',
  nau: 'NAU',
  hong: 'HON',
};

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

async function getNextSequence(prefix: string, dateStr: string): Promise<string> {
  const pattern = `${prefix}-${dateStr}-`;
  // Find existing codes with this pattern
  let count = 0;

  if (prefix === 'NK') {
    count = await prisma.goodsReceipt.count({ where: { code: { startsWith: pattern } } });
  } else if (prefix === 'XK') {
    count = await prisma.goodsIssue.count({ where: { code: { startsWith: pattern } } });
  } else if (prefix === 'GC') {
    count = await prisma.processingOrder.count({ where: { code: { startsWith: pattern } } });
  } else if (prefix === 'BBLOI') {
    count = await prisma.damageReport.count({ where: { code: { startsWith: pattern } } });
  } else if (prefix === 'KK') {
    count = await prisma.stocktake.count({ where: { code: { startsWith: pattern } } });
  } else if (prefix === 'DC') {
    count = await prisma.stockAdjustment.count({ where: { code: { startsWith: pattern } } });
  }

  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}-${dateStr}-${seq}`;
}

export async function generateReceiptCode(date: Date = new Date()): Promise<string> {
  return getNextSequence('NK', formatDate(date));
}

export async function generateIssueCode(date: Date = new Date()): Promise<string> {
  return getNextSequence('XK', formatDate(date));
}

export async function generateProcessingCode(date: Date = new Date()): Promise<string> {
  return getNextSequence('GC', formatDate(date));
}

export async function generateDamageCode(date: Date = new Date()): Promise<string> {
  return getNextSequence('BBLOI', formatDate(date));
}

export async function generateStocktakeCode(date: Date = new Date()): Promise<string> {
  return getNextSequence('KK', formatDate(date));
}

export async function generateAdjustmentCode(date: Date = new Date()): Promise<string> {
  return getNextSequence('DC', formatDate(date));
}

export function generateItemCode(
  glassType: string,
  thickness: number,
  color: string,
  size: string
): string {
  const typeCode = GLASS_TYPE_MAP[glassType] || 'K';
  const colorCode = COLOR_MAP[color] || color.toUpperCase().substring(0, 3);
  const thicknessStr = thickness % 1 === 0 ? String(thickness) : String(thickness);
  return `DAFA-${typeCode}-${thicknessStr}-${colorCode}-${size}`;
}

export async function generateCustomerCode(): Promise<string> {
  const count = await prisma.customer.count();
  const seq = String(count + 1).padStart(3, '0');
  return `KH-${seq}`;
}

export async function generateSupplierCode(): Promise<string> {
  const count = await prisma.supplier.count();
  const seq = String(count + 1).padStart(3, '0');
  return `NCC-${seq}`;
}
