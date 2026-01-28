import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, CheckCircle } from "lucide-react";

export default function StaffRegistration() {
  const [user, setUser] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: 'other',
  });

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      // Check if already registered
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) {
        setIsRegistered(true);
      }
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !form.full_name) return;

    setIsSubmitting(true);
    try {
      await base44.entities.Staff.create({
        full_name: form.full_name,
        email: user.email,
        phone: form.phone,
        address: form.address,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        role: 'temporary',
        status: 'active',
        approval_status: 'pending', // 管理者承認待ち
      });

      alert('スタッフ登録が完了しました。管理者の承認をお待ちください。');
      navigate(createPageUrl('Dashboard'));
    } catch (error) {
      console.error('登録エラー:', error);
      alert('登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-slate-400">読み込み中...</div>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-[#7CB342] mx-auto mb-4" />
          <h2 className="text-2xl font-medium text-slate-800 mb-2">既に登録済みです</h2>
          <p className="text-slate-600 mb-6">
            スタッフとして登録されています。<br />
            管理者の承認後、シフトに応募できるようになります。
          </p>
          <Button 
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="bg-[#2D4A6F]"
          >
            ダッシュボードへ
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="w-8 h-8" />
            <h1 className="text-3xl font-light">スタッフ登録</h1>
          </div>
          <p className="text-white/70">
            シフトに応募するには、まずスタッフ情報を登録してください。<br />
            登録後、管理者の承認をもって応募が可能になります。
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 -mt-6">
        <Card className="p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>氏名 *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({...form, full_name: e.target.value})}
                placeholder="山田 太郎"
                required
              />
            </div>

            <div>
              <Label>メールアドレス</Label>
              <Input
                value={user.email}
                disabled
                className="bg-slate-50"
              />
              <p className="text-xs text-slate-500 mt-1">※ログインメールアドレスが使用されます</p>
            </div>

            <div>
              <Label>電話番号</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({...form, phone: e.target.value})}
                placeholder="090-1234-5678"
              />
            </div>

            <div>
              <Label>住所</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({...form, address: e.target.value})}
                placeholder="石狩市..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>生年月日</Label>
                <Input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setForm({...form, date_of_birth: e.target.value})}
                />
              </div>
              <div>
                <Label>性別</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({...form, gender: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">男性</SelectItem>
                    <SelectItem value="female">女性</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-slate-600 mb-4">
                <strong>注意事項：</strong><br />
                ・登録後、管理者の承認をお待ちください。<br />
                ・承認が完了すると、シフトに応募できるようになります。<br />
                ・登録情報は後から変更できません。正確に入力してください。
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(createPageUrl('Home'))}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                className="bg-[#2D4A6F] flex-1"
                disabled={isSubmitting || !form.full_name}
              >
                {isSubmitting ? '登録中...' : '登録する'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}