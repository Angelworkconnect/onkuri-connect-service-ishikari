import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Lock, Unlock, AlertTriangle, Download, FileText, Users, Check, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import AttendanceEditDialog from "@/components/attendance/AttendanceEditDialog";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

// 締日設定に基づき、指定「締め年月ラベル」の勤怠対象期間を返す
// closeDay=0: 月末締め → その月の1日〜末日
// closeDay=N: N日締め → 前月N+1日〜当月N日
function getClosePeriod(yearMonth, closeDay) {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!closeDay || closeDay === 0) {
    // 月末締め
    const lastDay = new Date(y, m, 0).getDate();
    return {
      from: `${yearMonth}-01`,
      to: `${yearMonth}-${String(lastDay).padStart(2, '0')}`,
      label: `${yearMonth}（月末締め）`,
    };
  } else {
    // N日締め: 前月(N+1)日 〜 当月N日
    const prevDate = new Date(y, m - 2, closeDay + 1); // 前月のN+1日
    const toDate = new Date(y, m - 1, closeDay); // 当月N日
    const fromStr = format(prevDate, 'yyyy-MM-dd');
    const toStr = format(toDate, 'yyyy-MM-dd');
    return {
      from: fromStr,
      to: toStr,
      label: `${yearMonth}（${format(prevDate, 'M/d')}〜${format(toDate, 'M/d')}）`,
    };
  }
}

export default function AttendanceClose() {
  const [user, setUser] = useState(null);
  const [allStaff, setAllStaff] = useState([]);
  const [closeDay, setCloseDay] = useState(0); // 締日設定
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedYearMonth, setSelectedYearMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [exportMonth, setExportMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isExporting, setIsExporting] = useState(false);
  const [selectedStaffEmails, setSelectedStaffEmails] = useState(['__all__']); // '__all__' = 全員
  const [editingRecord, setEditingRecord] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState(null); // 展開中の締め履歴ID
  const [csvFormat, setCsvFormat] = useState('standard'); // CSV出力フォーマット
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
      const allStaffData = await base44.entities.Staff.list();
      setAllStaff(allStaffData);
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance-all'],
    queryFn: () => base44.entities.Attendance.list('-date'),
    enabled: !!user,
  });

  const { data: closedMonths = [] } = useQuery({
    queryKey: ['attendance-closed-months'],
    queryFn: () => base44.entities.AttendanceMonthlyClose.list('-year_month'),
    enabled: !!user,
  });

  // レート制限対策: 1件ずつ順番に処理
  const updateInBatches = async (records, updateFn, batchSize = 1, delayMs = 600) => {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await Promise.all(batch.map(updateFn));
      if (i + batchSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  };

  const closeMonthMutation = useMutation({
    mutationFn: async ({ yearMonth }) => {
      const records = attendanceRecords.filter(r => r.date.startsWith(yearMonth));
      const unapproved = records.filter(r => r.status !== 'approved');
      
      if (unapproved.length > 0) {
        throw new Error(`未承認の勤怠が${unapproved.length}件あります。先に承認してください。`);
      }

      // 勤怠レコードを締める（バッチ処理でレート制限回避）
      await updateInBatches(records, (r) =>
        base44.entities.Attendance.update(r.id, { 
          month_closed: true,
          closed_year_month: yearMonth 
        })
      );

      // 締め記録を作成
      return base44.entities.AttendanceMonthlyClose.create({
        year_month: yearMonth,
        closed_by: user.email,
        closed_by_name: user.full_name || user.email,
        total_records: records.length,
        unapproved_count: unapproved.length,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-all']);
      queryClient.invalidateQueries(['attendance-closed-months']);
      setCloseDialogOpen(false);
      alert('月次締めが完了しました');
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const reopenMonthMutation = useMutation({
    mutationFn: async (closeRecord) => {
      const records = attendanceRecords.filter(r => r.closed_year_month === closeRecord.year_month);
      
      // 勤怠レコードの締めを解除（バッチ処理）
      await updateInBatches(records, (r) =>
        base44.entities.Attendance.update(r.id, { 
          month_closed: false,
          closed_year_month: null
        })
      );

      // 締め記録を更新
      return base44.entities.AttendanceMonthlyClose.update(closeRecord.id, {
        is_reopened: true,
        reopened_by: user.email,
        reopened_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-all']);
      queryClient.invalidateQueries(['attendance-closed-months']);
      alert('月次締めを再開しました');
    },
  });

  const handleClose = () => {
    if (!selectedYearMonth) {
      alert('対象年月を選択してください');
      return;
    }
    
    if (!confirm(`${selectedYearMonth}の勤怠を締めますか？`)) {
      return;
    }

    closeMonthMutation.mutate({ yearMonth: selectedYearMonth });
  };

  const calcWorkMinutes = (clockIn, clockOut, breakMins = 0) => {
    if (!clockIn || !clockOut) return 0;
    const [inH, inM] = clockIn.split(':').map(Number);
    const [outH, outM] = clockOut.split(':').map(Number);
    return Math.max(0, (outH * 60 + outM) - (inH * 60 + inM) - (breakMins || 0));
  };

  const toggleStaff = (email) => {
    if (email === '__all__') {
      setSelectedStaffEmails(['__all__']);
    } else {
      setSelectedStaffEmails(prev => {
        const withoutAll = prev.filter(e => e !== '__all__');
        if (withoutAll.includes(email)) {
          const next = withoutAll.filter(e => e !== email);
          return next.length === 0 ? ['__all__'] : next;
        } else {
          return [...withoutAll, email];
        }
      });
    }
  };

  const isAllSelected = selectedStaffEmails.includes('__all__');

  const getExportRecords = (yearMonth) => {
    return attendanceRecords
      .filter(r => {
        if (!r.date.startsWith(yearMonth)) return false;
        if (isAllSelected) return true;
        return selectedStaffEmails.includes(r.user_email);
      })
      .sort((a, b) => a.date.localeCompare(b.date) || (a.user_email || '').localeCompare(b.user_email || ''));
  };

  // 時刻→小数時間 (例: "09:30" → 9.5)
  const timeToDecimal = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return ((h * 60 + m) / 60).toFixed(4);
  };

  // CSV フォーマット定義
  const CSV_FORMATS = {
    standard: {
      label: '汎用（標準）',
      desc: '氏名・日付・時刻・実働時間など基本情報',
      build: (records) => {
        const header = ['外部コード', '氏名', 'メール', '勤務日', '曜日', '出勤時刻', '退勤時刻', '休憩(分)', '実労働時間(h)', '実労働時間(分)', '状態', '備考', '修正理由'];
        const rows = records.map(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const name = staff?.full_name || r.user_name || r.user_email;
          const code = staff?.external_staff_code || '';
          const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
          const dow = ['日','月','火','水','木','金','土'][new Date(r.date).getDay()];
          return [code, name, r.user_email, r.date, dow, r.clock_in||'', r.clock_out||'',
            r.break_minutes||0, (mins/60).toFixed(2), mins,
            r.status==='approved'?'承認済':r.status==='completed'?'承認待':'勤務中',
            r.notes||'', r.correction_reason||''];
        });
        return [header, ...rows];
      },
    },
    mfkyuyo: {
      label: 'MFクラウド給与',
      desc: '氏名・日付・出退勤時刻・休憩・実働(h)形式',
      build: (records) => {
        const header = ['従業員名', '日付', '出勤時刻', '退勤時刻', '休憩時間', '実労働時間', '備考'];
        const rows = records.map(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const name = staff?.full_name || r.user_name || r.user_email;
          const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
          const breakH = `${Math.floor((r.break_minutes||0)/60).toString().padStart(2,'0')}:${((r.break_minutes||0)%60).toString().padStart(2,'0')}`;
          const workH = `${Math.floor(mins/60).toString().padStart(2,'0')}:${(mins%60).toString().padStart(2,'0')}`;
          // MFクラウド給与は氏名のみ（コード列なし）
          return [name, r.date, r.clock_in||'', r.clock_out||'', breakH, workH, r.notes||''];
        });
        return [header, ...rows];
      },
    },
    freee: {
      label: 'freee人事労務',
      desc: '社員番号・メール・日付・時刻・小数時間形式',
      build: (records) => {
        const header = ['社員番号', '氏名', 'メールアドレス', '勤務日', '出勤時刻', '退勤時刻', '休憩時間(h)', '勤務時間(h)', 'メモ'];
        const rows = records.map(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const name = staff?.full_name || r.user_name || r.user_email;
          const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
          return [staff?.external_staff_code||'', name, r.user_email, r.date, r.clock_in||'', r.clock_out||'',
            ((r.break_minutes||0)/60).toFixed(4), (mins/60).toFixed(4), r.notes||''];
        });
        return [header, ...rows];
      },
    },
    jobcan: {
      label: 'ジョブカン',
      desc: 'スタッフコード・氏名・打刻形式',
      build: (records) => {
        const header = ['スタッフコード', '氏名', '日付', '出勤', '退勤', '休憩(分)', '実働時間', '残業時間', '備考'];
        const rows = records.map(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const name = staff?.full_name || r.user_name || r.user_email;
          const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
          const workH = `${Math.floor(mins/60)}:${(mins%60).toString().padStart(2,'0')}`;
          return [staff?.external_staff_code||'', name, r.date, r.clock_in||'', r.clock_out||'', r.break_minutes||0, workH, '0:00', r.notes||''];
        });
        return [header, ...rows];
      },
    },
    kinokuniya: {
      label: '勤次郎 / KING OF TIME',
      desc: '従業員コード・氏名・日付・開始・終了形式',
      build: (records) => {
        const header = ['従業員コード', '従業員名', '日付', '開始時刻', '終了時刻', '休憩(分)', '実働時間(分)', '備考'];
        const rows = records.map(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const name = staff?.full_name || r.user_name || r.user_email;
          const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
          return [staff?.external_staff_code||'', name, r.date, r.clock_in||'', r.clock_out||'', r.break_minutes||0, mins, r.notes||''];
        });
        return [header, ...rows];
      },
    },
    decimal: {
      label: '小数時間形式（汎用）',
      desc: '時刻を全て小数(例:9.5h)で出力。Excelでの計算に最適',
      build: (records) => {
        const header = ['氏名', '日付', '出勤(h)', '退勤(h)', '休憩(h)', '実働(h)', '状態'];
        const rows = records.map(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const name = staff?.full_name || r.user_name || r.user_email;
          const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
          return [name, r.date,
            timeToDecimal(r.clock_in), timeToDecimal(r.clock_out),
            ((r.break_minutes||0)/60).toFixed(4), (mins/60).toFixed(4),
            r.status==='approved'?'承認済':r.status==='completed'?'承認待':'勤務中'];
        });
        return [header, ...rows];
      },
    },
    smarthr: {
      label: 'SmartHR',
      desc: '従業員番号・氏名・日付・出退勤・実働(分)形式',
      build: (records) => {
        const header = ['従業員番号', '氏名', '日付', '出勤時刻', '退勤時刻', '休憩時間(分)', '実労働時間(分)', '備考'];
        const rows = records.map(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const name = staff?.full_name || r.user_name || r.user_email;
          const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
          return [staff?.external_staff_code||'', name, r.date, r.clock_in||'', r.clock_out||'', r.break_minutes||0, mins, r.notes||''];
        });
        return [header, ...rows];
      },
    },
    yayoi: {
      label: '弥生給与・弥生給与Next',
      desc: '社員コード・氏名・日付・時刻・実働時間(h:m)形式',
      build: (records) => {
        const header = ['社員コード', '氏名', '日付', '出勤時刻', '退勤時刻', '休憩(分)', '実働時間'];
        const rows = records.map(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const name = staff?.full_name || r.user_name || r.user_email;
          const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
          const workH = `${Math.floor(mins/60)}:${(mins%60).toString().padStart(2,'0')}`;
          return [staff?.external_staff_code||'', name, r.date, r.clock_in||'', r.clock_out||'', r.break_minutes||0, workH];
        });
        return [header, ...rows];
      },
    },
    obckyuyo: {
      label: '給与奉行（OBC）',
      desc: '社員コード・氏名・年月日・出退勤・就業時間形式',
      build: (records) => {
        const header = ['社員コード', '社員名', '年月日', '出勤時刻', '退勤時刻', '休憩時間', '就業時間', '備考'];
        const rows = records.map(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const name = staff?.full_name || r.user_name || r.user_email;
          const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
          const breakH = `${Math.floor((r.break_minutes||0)/60).toString().padStart(2,'0')}:${((r.break_minutes||0)%60).toString().padStart(2,'0')}`;
          const workH = `${Math.floor(mins/60).toString().padStart(2,'0')}:${(mins%60).toString().padStart(2,'0')}`;
          return [staff?.external_staff_code||'', name, r.date.replace(/-/g,'/'), r.clock_in||'', r.clock_out||'', breakH, workH, r.notes||''];
        });
        return [header, ...rows];
      },
    },
    pca: {
      label: 'PCA給与',
      desc: '社員コード・氏名・日付・出退勤・実働時間(分)形式',
      build: (records) => {
        const header = ['社員コード', '社員名', '日付', '出勤', '退勤', '休憩(分)', '実働(分)', '摘要'];
        const rows = records.map(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const name = staff?.full_name || r.user_name || r.user_email;
          const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
          return [staff?.external_staff_code||'', name, r.date, r.clock_in||'', r.clock_out||'', r.break_minutes||0, mins, r.notes||''];
        });
        return [header, ...rows];
      },
    },
    harmos: {
      label: 'クラウドハーモス',
      desc: 'スタッフID・氏名・日付・打刻時刻・勤務時間形式',
      build: (records) => {
        const header = ['スタッフID', '氏名', '日付', '出勤打刻', '退勤打刻', '休憩(分)', '勤務時間(h)', '備考'];
        const rows = records.map(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const name = staff?.full_name || r.user_name || r.user_email;
          const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
          return [staff?.external_staff_code||'', name, r.date, r.clock_in||'', r.clock_out||'', r.break_minutes||0, (mins/60).toFixed(2), r.notes||''];
        });
        return [header, ...rows];
      },
    },
    akashi: {
      label: 'AKASHI / タイムワールド',
      desc: '従業員番号・氏名・日付・出退勤・休憩・実働(分)形式',
      build: (records) => {
        const header = ['従業員番号', '従業員名', '勤務日', '出勤時刻', '退勤時刻', '休憩時間(分)', '実働時間(分)', '勤務メモ'];
        const rows = records.map(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const name = staff?.full_name || r.user_name || r.user_email;
          const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
          return [staff?.external_staff_code||'', name, r.date, r.clock_in||'', r.clock_out||'', r.break_minutes||0, mins, r.notes||''];
        });
        return [header, ...rows];
      },
    },
    moneyforward_attendance: {
      label: 'マネーフォワード クラウド勤怠',
      desc: '打刻単位（出勤・退勤・休憩を別行）で出力。公式インポート形式',
      build: (records) => {
        // 公式仕様: 従業員番号,苗字,名前,打刻所属日,打刻日,打刻時刻,打刻種別
        const header = ['従業員番号', '苗字', '名前', '打刻所属日', '打刻日', '打刻時刻', '打刻種別'];
        const rows = [];
        records.forEach(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const fullName = staff?.full_name || r.user_name || r.user_email;
          // 苗字・名前を分割（スペースで区切る、なければ全て苗字に）
          const nameParts = fullName.split(/[\s　]+/);
          const lastName = nameParts[0] || fullName;
          const firstName = nameParts.slice(1).join(' ') || '';
          // 日付を yyyy/MM/dd 形式に
          const dateFormatted = r.date.replace(/-/g, '/');
          // 出勤
          if (r.clock_in) {
            rows.push([staff?.external_staff_code||'', lastName, firstName, dateFormatted, dateFormatted, r.clock_in, '出勤']);
          }
          // 休憩（break_minutesがある場合、開始・終了を推定）
          if (r.break_minutes && r.break_minutes > 0 && r.clock_in && r.clock_out) {
            const [outH, outM] = r.clock_out.split(':').map(Number);
            const breakStart = outH * 60 + outM - r.break_minutes;
            const bsH = Math.floor(breakStart / 60).toString().padStart(2, '0');
            const bsM = (breakStart % 60).toString().padStart(2, '0');
            rows.push([staff?.external_staff_code||'', lastName, firstName, dateFormatted, dateFormatted, `${bsH}:${bsM}`, '休憩開始']);
            rows.push([staff?.external_staff_code||'', lastName, firstName, dateFormatted, dateFormatted, r.clock_out, '休憩終了']);
          }
          // 退勤
          if (r.clock_out) {
            rows.push([staff?.external_staff_code||'', lastName, firstName, dateFormatted, dateFormatted, r.clock_out, '退勤']);
          }
        });
        return [header, ...rows];
      },
    },
    teamspirit: {
      label: 'TeamSpirit',
      desc: 'ユーザーID・氏名・日付・開始終了・稼働時間形式',
      build: (records) => {
        const header = ['ユーザーID', '氏名', '日付', '開始時刻', '終了時刻', '休憩(分)', '稼働時間(h)', 'コメント'];
        const rows = records.map(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const name = staff?.full_name || r.user_name || r.user_email;
          const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
          return [r.user_email, name, r.date, r.clock_in||'', r.clock_out||'', r.break_minutes||0, (mins/60).toFixed(2), r.notes||''];
        });
        return [header, ...rows];
      },
    },
    kincone: {
      label: 'キンコーン / Touch On Time',
      desc: '社員番号・氏名・年月日・出退勤・実働(hh:mm)形式',
      build: (records) => {
        const header = ['社員番号', '氏名', '年月日', '出勤', '退勤', '休憩時間', '実働時間'];
        const rows = records.map(r => {
          const staff = allStaff.find(s => s.email === r.user_email);
          const name = staff?.full_name || r.user_name || r.user_email;
          const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
          const breakH = `${Math.floor((r.break_minutes||0)/60).toString().padStart(2,'0')}:${((r.break_minutes||0)%60).toString().padStart(2,'0')}`;
          const workH = `${Math.floor(mins/60).toString().padStart(2,'0')}:${(mins%60).toString().padStart(2,'0')}`;
          return [staff?.external_staff_code||'', name, r.date, r.clock_in||'', r.clock_out||'', breakH, workH];
        });
        return [header, ...rows];
      },
    },
  };

  const handleExportCSV = () => {
    const records = getExportRecords(exportMonth);
    if (records.length === 0) { alert('対象データがありません'); return; }
    setIsExporting(true);
    const fmt = CSV_FORMATS[csvFormat] || CSV_FORMATS.standard;
    const rows = fmt.build(records);
    const csv = '\uFEFF' + rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `勤怠_${exportMonth}_${fmt.label}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    setIsExporting(false);
  };

  const handleExportHTML = () => {
    const records = getExportRecords(exportMonth);
    if (records.length === 0) { alert('対象データがありません'); return; }
    setIsExporting(true);

    // スタッフ別にグループ化
    const byStaff = {};
    records.forEach(r => {
      const staff = allStaff.find(s => s.email === r.user_email);
      const name = staff?.full_name || r.user_name || r.user_email;
      if (!byStaff[r.user_email]) byStaff[r.user_email] = { name, records: [] };
      byStaff[r.user_email].records.push(r);
    });

    const staffSections = Object.values(byStaff).map(({ name, records: recs }) => {
      const totalMins = recs.reduce((s, r) => s + calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes), 0);
      const rows = recs.map(r => {
        const mins = calcWorkMinutes(r.clock_in, r.clock_out, r.break_minutes);
        const statusLabel = r.status === 'approved' ? '承認済' : r.status === 'completed' ? '承認待' : '勤務中';
        return `<tr><td>${r.date}</td><td>${r.clock_in||'-'}</td><td>${r.clock_out||'-'}</td><td>${r.break_minutes||0}分</td><td>${Math.floor(mins/60)}時間${mins%60}分</td><td>${statusLabel}</td><td>${r.notes||''}</td></tr>`;
      }).join('');
      return `<div class="staff-block"><h3>${name} <span class="total">合計: ${Math.floor(totalMins/60)}時間${totalMins%60}分 / ${recs.length}日</span></h3><table><thead><tr><th>日付</th><th>出勤</th><th>退勤</th><th>休憩</th><th>実働</th><th>状態</th><th>備考</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>勤怠レポート ${exportMonth}</title><style>body{font-family:'Hiragino Sans','Meiryo',sans-serif;padding:20px;color:#333}h1{color:#2D4A6F;border-bottom:2px solid #2D4A6F;padding-bottom:8px}.staff-block{margin-bottom:30px}h3{color:#2D4A6F;margin:16px 0 8px;font-size:16px}.total{font-size:13px;color:#666;font-weight:normal;margin-left:12px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #ddd;padding:6px 10px;text-align:left}th{background:#f0f4f8;color:#2D4A6F}tr:nth-child(even){background:#f9fafb}.footer{margin-top:20px;font-size:12px;color:#999}</style></head><body><h1>勤怠レポート ${exportMonth}</h1><p>出力日時: ${format(new Date(), 'yyyy/MM/dd HH:mm')}</p>${staffSections}<div class="footer">このレポートは自動生成されました</div></body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `勤怠レポート_${exportMonth}.html`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    setIsExporting(false);
  };

  // 月別集計
  const getMonthlyStats = (yearMonth) => {
    const records = attendanceRecords.filter(r => r.date.startsWith(yearMonth));
    const approved = records.filter(r => r.status === 'approved').length;
    const closed = records.filter(r => r.month_closed).length;
    return { total: records.length, approved, closed };
  };

  // 過去6ヶ月分の年月を生成
  const generateRecentMonths = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = format(date, 'yyyy-MM');
      months.push(yearMonth);
    }
    return months;
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
          <h1 className="text-3xl font-light mb-2">勤怠月次締め</h1>
          <p className="text-white/70">月ごとの勤怠を締めてMF給与連携に進みます</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-6 space-y-6">
        {/* 月次締め実行 */}
        <Card className="border-0 shadow-lg p-6">
          <h2 className="text-lg font-medium mb-4">新規月次締め</h2>
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
              onClick={() => setCloseDialogOpen(true)}
              className="bg-[#2D4A6F]"
              disabled={!selectedYearMonth}
            >
              <Lock className="w-4 h-4 mr-2" />
              月次締めを実行
            </Button>
          </div>
        </Card>

        {/* CSV / HTML出力 */}
        <Card className="border-0 shadow-lg p-6">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-[#2D4A6F]" />
            勤怠データ出力
          </h2>
          <p className="text-sm text-slate-500 mb-4">締め済み・未締め問わず出力できます。</p>
          
          <div className="space-y-5">
            {/* 年月選択 */}
            <div>
              <Label>対象年月</Label>
              <Input
                type="month"
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value)}
                className="w-44 mt-1"
              />
            </div>

            {/* スタッフ選択 */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" />
                出力対象スタッフ
              </Label>
              <div className="flex flex-wrap gap-2">
                {/* 全員ボタン */}
                <button
                  type="button"
                  onClick={() => toggleStaff('__all__')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    isAllSelected
                      ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-[#2D4A6F]'
                  }`}
                >
                  {isAllSelected && <Check className="w-3.5 h-3.5" />}
                  全員
                </button>
                {/* 個別スタッフ */}
                {allStaff.filter(s => s.status !== 'inactive').map(staff => {
                  const selected = !isAllSelected && selectedStaffEmails.includes(staff.email);
                  return (
                    <button
                      key={staff.email}
                      type="button"
                      onClick={() => toggleStaff(staff.email)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selected
                          ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-[#2D4A6F]'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5" />}
                      {staff.full_name}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {isAllSelected
                  ? 'すべてのスタッフが対象です'
                  : `${selectedStaffEmails.length}名が選択されています`}
              </p>
            </div>

            {/* CSV フォーマット選択 */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" />
                CSVフォーマット
              </Label>
              {[
                { group: '汎用・Excel', keys: ['standard', 'decimal'] },
                { group: 'クラウド給与・HR系', keys: ['mfkyuyo', 'moneyforward_attendance', 'freee', 'smarthr'] },
                { group: '勤怠管理システム', keys: ['jobcan', 'kinokuniya', 'harmos', 'akashi', 'kincone', 'teamspirit'] },
                { group: 'パッケージ給与ソフト', keys: ['yayoi', 'obckyuyo', 'pca'] },
              ].map(({ group, keys }) => (
                <div key={group} className="mb-3">
                  <p className="text-xs font-medium text-slate-400 mb-1.5">{group}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {keys.map(key => {
                      const fmt = CSV_FORMATS[key];
                      if (!fmt) return null;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setCsvFormat(key)}
                          className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                            csvFormat === key
                              ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-[#2D4A6F]'
                          }`}
                        >
                          <div className="font-medium text-sm">{fmt.label}</div>
                          <div className={`text-xs mt-0.5 leading-tight ${csvFormat === key ? 'text-white/70' : 'text-slate-400'}`}>{fmt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 出力ボタン */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleExportCSV}
                variant="outline"
                disabled={isExporting || !exportMonth}
                className="border-[#2D4A6F] text-[#2D4A6F]"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV出力
              </Button>
              <Button
                onClick={handleExportHTML}
                variant="outline"
                disabled={isExporting || !exportMonth}
                className="border-emerald-600 text-emerald-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                HTMLレポート出力
              </Button>
            </div>
          </div>
        </Card>

        {/* 月別状況 */}
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium">月別勤怠状況</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>年月</TableHead>
                  <TableHead>勤怠件数</TableHead>
                  <TableHead>承認済み</TableHead>
                  <TableHead>締め済み</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generateRecentMonths().map((yearMonth) => {
                  const stats = getMonthlyStats(yearMonth);
                  const closeRecord = closedMonths.find(c => c.year_month === yearMonth && !c.is_reopened);
                  const isClosed = stats.closed === stats.total && stats.total > 0;

                  return (
                    <TableRow key={yearMonth}>
                      <TableCell className="font-medium">{yearMonth}</TableCell>
                      <TableCell>{stats.total}件</TableCell>
                      <TableCell>{stats.approved}件</TableCell>
                      <TableCell>{stats.closed}件</TableCell>
                      <TableCell>
                        {isClosed ? (
                          <Badge className="bg-slate-100 text-slate-600">
                            <Lock className="w-3 h-3 mr-1" />
                            締め済み
                          </Badge>
                        ) : stats.total === 0 ? (
                          <Badge variant="outline" className="text-slate-400">データなし</Badge>
                        ) : stats.approved < stats.total ? (
                          <Badge className="bg-amber-100 text-amber-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            未承認あり
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-600">承認完了・未締め</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isClosed && closeRecord && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`${yearMonth}の締めを再開しますか？\n編集可能になります。`)) {
                                reopenMonthMutation.mutate(closeRecord);
                              }
                            }}
                          >
                            <Unlock className="w-4 h-4 mr-1" />
                            再開
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* 締め履歴 */}
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium">締め履歴</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>年月</TableHead>
                  <TableHead>実行者</TableHead>
                  <TableHead>実行日時</TableHead>
                  <TableHead>件数</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedMonths.map((record) => {
                  const isExpanded = expandedHistory === record.id;
                  const monthRecords = attendanceRecords
                    .filter(r => r.date.startsWith(record.year_month))
                    .sort((a, b) => a.date.localeCompare(b.date) || (a.user_email || '').localeCompare(b.user_email || ''));

                  return (
                    <React.Fragment key={record.id}>
                      <TableRow className="hover:bg-slate-50">
                        <TableCell className="font-medium">{record.year_month}</TableCell>
                        <TableCell>{record.closed_by_name}</TableCell>
                        <TableCell>{format(new Date(record.created_date), 'yyyy/MM/dd HH:mm')}</TableCell>
                        <TableCell>{record.total_records}件</TableCell>
                        <TableCell>
                          {record.is_reopened ? (
                            <Badge variant="outline" className="text-amber-600">再開済み</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600">締め済み</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {/* 再開ボタン（締め済みのみ） */}
                            {!record.is_reopened && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (confirm(`${record.year_month}の締めを再開しますか？`)) {
                                    reopenMonthMutation.mutate(record);
                                  }
                                }}
                              >
                                <Unlock className="w-3.5 h-3.5 mr-1" />
                                再開
                              </Button>
                            )}
                            {/* 勤怠を展開して修正 */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setExpandedHistory(isExpanded ? null : record.id)}
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" />
                              勤怠修正
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* 展開された勤怠レコード一覧 */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="p-0 bg-slate-50">
                            <div className="p-4">
                              <p className="text-xs text-slate-500 mb-3">{record.year_month} の勤怠レコード（{monthRecords.length}件）</p>
                              <div className="rounded-lg border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-100">
                                    <tr>
                                      <th className="text-left p-2 font-medium text-slate-600">日付</th>
                                      <th className="text-left p-2 font-medium text-slate-600">氏名</th>
                                      <th className="text-left p-2 font-medium text-slate-600">出勤</th>
                                      <th className="text-left p-2 font-medium text-slate-600">退勤</th>
                                      <th className="text-left p-2 font-medium text-slate-600">状態</th>
                                      <th className="text-left p-2 font-medium text-slate-600"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {monthRecords.map(r => {
                                      const staff = allStaff.find(s => s.email === r.user_email);
                                      const name = staff?.full_name || r.user_name || r.user_email;
                                      const statusLabel = r.status === 'approved' ? '承認済' : r.status === 'completed' ? '承認待' : '勤務中';
                                      return (
                                        <tr key={r.id} className="border-t border-slate-200 hover:bg-white">
                                          <td className="p-2">{r.date}</td>
                                          <td className="p-2">{name}</td>
                                          <td className="p-2">{r.clock_in || '-'}</td>
                                          <td className="p-2">{r.clock_out || '-'}</td>
                                          <td className="p-2">
                                            <Badge className={r.status === 'approved' ? 'bg-green-100 text-green-700 text-xs' : 'bg-amber-100 text-amber-700 text-xs'}>
                                              {statusLabel}
                                            </Badge>
                                          </td>
                                          <td className="p-2">
                                            <Button size="sm" variant="ghost" onClick={() => setEditingRecord(r)}>
                                              <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* 勤怠修正ダイアログ */}
      {editingRecord && (
        <AttendanceEditDialog
          record={editingRecord}
          open={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          onSaved={() => {
            queryClient.invalidateQueries(['attendance-all']);
            setEditingRecord(null);
          }}
        />
      )}

      {/* 締め確認ダイアログ */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>月次締め確認</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-700">
              {selectedYearMonth}の勤怠を締めます。
            </p>
            <p className="text-sm text-slate-500 mt-2">
              ※承認済みの勤怠のみ締められます<br />
              ※締め後も編集は可能です（締め状態は維持）
            </p>
            {selectedYearMonth && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">対象勤怠数:</span>
                    <span className="font-medium">{getMonthlyStats(selectedYearMonth).total}件</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">承認済み:</span>
                    <span className="font-medium">{getMonthlyStats(selectedYearMonth).approved}件</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleClose}
              className="bg-[#2D4A6F]"
              disabled={closeMonthMutation.isPending}
            >
              {closeMonthMutation.isPending ? '実行中...' : '締めを実行'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}