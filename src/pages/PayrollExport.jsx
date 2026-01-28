import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function PayrollExport() {
  const [user, setUser] = useState(null);
  const [selectedYearMonth, setSelectedYearMonth] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(async (u) => {
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      const isAdmin = u.role === 'admin' || (staffList.length > 0 && staffList[0].role === 'admin');
      
      if (!isAdmin) {
        alert('管理者のみアクセス可能です');
        window.location.href = '/';
        return;
      }
      setUser(u);
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance-for-payroll'],
    queryFn: () => base44.entities.Attendance.list('-date'),
    enabled: !!user,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['staff-for-payroll'],
    queryFn: () => base44.entities.Staff.list(),
    enabled: !!user,
  });

  const { data: closedMonths = [] } = useQuery({
    queryKey: ['closed-months-payroll'],
    queryFn: () => base44.entities.AttendanceMonthlyClose.list('-year_month'),
    enabled: !!user,
  });

  const { data: exportHistory = [] } = useQuery({
    queryKey: ['payroll-export-history'],
    queryFn: () => base44.entities.PayrollExport.list('-created_date'),
    enabled: !!user,
  });

  const createExportRecordMutation = useMutation({
    mutationFn: (data) => base44.entities.PayrollExport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['payroll-export-history']);
    },
  });

  const handleExport = async () => {
    if (!selectedYearMonth) {
      alert('対象年月を選択してください');
      return;
    }

    // 締め済みチェック
    const closeRecord = closedMonths.find(c => c.year_month === selectedYearMonth && !c.is_reopened);
    if (!closeRecord) {
      alert('この月はまだ締められていません。先に月次締めを実行してください。');
      return;
    }

    setIsExporting(true);

    try {
      // 対象月の勤怠データを取得
      const records = attendanceRecords.filter(r => 
        r.date.startsWith(selectedYearMonth) && 
        r.month_closed && 
        r.status === 'approved'
      );

      if (records.length === 0) {
        alert('出力対象のデータがありません');
        setIsExporting(false);
        return;
      }

      // CSV生成
      const csvRows = [];
      // ヘッダー行
      csvRows.push([
        '社員番号',
        '氏名',
        '勤務日',
        '出勤時刻',
        '退勤時刻',
        '休憩時間（分）',
        '実労働時間（時）',
        '雇用区分',
        '拠点コード'
      ].join(','));

      // データ行
      records.forEach(record => {
        const staff = allStaff.find(s => s.email === record.user_email);
        const employmentType = staff?.role === 'full_time' ? '正社員' : 
                               staff?.role === 'part_time' ? 'パート' : '単発';
        
        // 実労働時間計算
        let workHours = 0;
        if (record.clock_in && record.clock_out) {
          const [inH, inM] = record.clock_in.split(':').map(Number);
          const [outH, outM] = record.clock_out.split(':').map(Number);
          const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - (record.break_minutes || 0);
          workHours = (totalMinutes / 60).toFixed(2);
        }

        csvRows.push([
          staff?.email || record.user_email,  // 社員番号（メールアドレス）
          staff?.full_name || record.user_name,
          record.date,
          record.clock_in || '',
          record.clock_out || '',
          record.break_minutes || 0,
          workHours,
          employmentType,
          '001'  // 拠点コード（固定）
        ].join(','));
      });

      const csvContent = '\uFEFF' + csvRows.join('\n');  // BOM付きUTF-8
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MF給与_勤怠データ_${selectedYearMonth}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // 出力履歴を記録
      await createExportRecordMutation.mutateAsync({
        year_month: selectedYearMonth,
        exported_by: user.email,
        exported_by_name: user.full_name || user.email,
        record_count: records.length,
        file_name: `MF給与_勤怠データ_${selectedYearMonth}.csv`,
      });

      alert(`${records.length}件の勤怠データをCSV出力しました`);
    } catch (error) {
      console.error('CSV出力エラー:', error);
      alert('CSV出力に失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-light mb-2">給与連携（マネーフォワード）</h1>
          <p className="text-white/70">締められた勤怠をMF給与用CSVで出力します</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-6 space-y-6">
        {/* CSV出力 */}
        <Card className="border-0 shadow-lg p-6">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Download className="w-5 h-5" />
            MF給与用CSVダウンロード
          </h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">重要な注意事項</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>月次締め済みの勤怠のみ出力できます</li>
                  <li>出力項目：社員番号、氏名、勤務日、出退勤時刻、休憩時間、実労働時間、雇用区分、拠点コード</li>
                  <li>チップ・ポイントは含まれません（MF給与の外で管理）</li>
                  <li>拠点コードは「001」固定です</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <Label>対象年月</Label>
              <Input
                type="month"
                value={selectedYearMonth}
                onChange={(e) => setSelectedYearMonth(e.target.value)}
              />
            </div>
            <Button
              onClick={handleExport}
              className="bg-[#2D4A6F]"
              disabled={!selectedYearMonth || isExporting}
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'CSV生成中...' : 'CSV出力'}
            </Button>
          </div>
        </Card>

        {/* 出力履歴 */}
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <FileText className="w-5 h-5" />
              CSV出力履歴
            </h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>対象年月</TableHead>
                  <TableHead>出力日時</TableHead>
                  <TableHead>出力者</TableHead>
                  <TableHead>件数</TableHead>
                  <TableHead>ファイル名</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                      出力履歴はありません
                    </TableCell>
                  </TableRow>
                ) : (
                  exportHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.year_month}</TableCell>
                      <TableCell>{format(new Date(record.created_date), 'yyyy/MM/dd HH:mm')}</TableCell>
                      <TableCell>{record.exported_by_name}</TableCell>
                      <TableCell>{record.record_count}件</TableCell>
                      <TableCell className="text-sm text-slate-600">{record.file_name}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* 締め済み月一覧 */}
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium">締め済み月一覧（出力可能）</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {closedMonths.filter(c => !c.is_reopened).map((record) => (
                <div
                  key={record.id}
                  className="p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="text-lg font-medium text-[#2D4A6F]">{record.year_month}</div>
                  <div className="text-sm text-slate-600 mt-1">{record.total_records}件</div>
                </div>
              ))}
              {closedMonths.filter(c => !c.is_reopened).length === 0 && (
                <div className="col-span-full text-center text-slate-400 py-8">
                  締め済みの月はありません
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}