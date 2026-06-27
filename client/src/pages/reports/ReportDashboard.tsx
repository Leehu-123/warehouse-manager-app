import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import DataTable, { type Column } from '../../components/shared/DataTable';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Item } from '../../types';

interface XNTReportRow {
  itemId: number;
  item: Item;
  startQty: number;
  inQty: number;
  outQty: number;
  endQty: number;
}

const ReportDashboard: React.FC = () => {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [data, setData] = useState<XNTReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        t: String(Date.now()),
      });
      const res = await api.get<{ data: XNTReportRow[] }>(`/reports/xnt?${params.toString()}`);
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch report', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const exportExcel = () => {
    const wsData = data.map(row => ({
      'Mã vật tư': row.item.code,
      'Tên vật tư': row.item.name,
      'Quy cách': row.item.standardSize || '-',
      'ĐVT': row.item.unit,
      'Tồn đầu kỳ': row.startQty,
      'Nhập trong kỳ': row.inQty,
      'Xuất trong kỳ': row.outQty,
      'Tồn cuối kỳ': row.endQty,
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'XNT');
    XLSX.writeFile(wb, `BaoCao_XNT_${startDate}_${endDate}.xlsx`);
  };

  const columns: Column<XNTReportRow>[] = [
    { key: 'code', label: 'Mã vật tư', render: (r: XNTReportRow) => <span className="font-medium text-brand-600">{r.item.code}</span> },
    { key: 'name', label: 'Tên vật tư', render: (r: XNTReportRow) => <span>{r.item.name}</span> },
    { key: 'unit', label: 'ĐVT', render: (r: XNTReportRow) => <span>{r.item.unit}</span> },
    { key: 'startQty', label: 'Tồn đầu kỳ', render: (r: XNTReportRow) => <span className="font-medium text-gray-600">{r.startQty}</span> },
    { key: 'inQty', label: 'Nhập trong kỳ', render: (r: XNTReportRow) => <span className="font-medium text-green-600">+{r.inQty}</span> },
    { key: 'outQty', label: 'Xuất trong kỳ', render: (r: XNTReportRow) => <span className="font-medium text-red-600">-{r.outQty}</span> },
    { key: 'endQty', label: 'Tồn cuối kỳ', render: (r: XNTReportRow) => <span className="font-bold text-gray-900">{r.endQty}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Báo cáo Nhập - Xuất - Tồn</h1>
        <button onClick={exportExcel} className="btn btn-secondary flex items-center gap-2">
          <Download className="w-5 h-5" />
          Xuất Excel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-end gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Từ ngày</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
          <button onClick={fetchReport} disabled={loading} className="btn btn-primary">
            {loading ? 'Đang tải...' : 'Xem báo cáo'}
          </button>
        </div>

        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(r) => r.itemId}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ReportDashboard;
