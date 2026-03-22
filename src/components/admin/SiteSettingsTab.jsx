import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function SiteSettingsTab({ settingsForm, setSettingsForm, onSave, isSaving }) {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-lg font-medium">TOPページカスタマイズ</h2>
        </div>
        <div className="p-6 space-y-6 max-w-2xl">
          <div>
            <Label>事業所名</Label>
            <Input
              value={settingsForm.office_name || ''}
              onChange={(e) => setSettingsForm({...settingsForm, office_name: e.target.value})}
              placeholder="おんくりの輪"
            />
            <p className="text-xs text-slate-400 mt-1">ヘッダーやタイトルなどに表示される事業所名</p>
          </div>
          <div>
            <Label>ロゴ文字（1文字）</Label>
            <Input
              value={settingsForm.logo_char || ''}
              onChange={(e) => setSettingsForm({...settingsForm, logo_char: e.target.value.slice(0, 1)})}
              placeholder="輪"
              maxLength={1}
              className="w-20"
            />
            <p className="text-xs text-slate-400 mt-1">ヘッダーのロゴアイコンに表示する1文字</p>
          </div>
          <div>
            <Label>ヒーロータイトル</Label>
            <Textarea
              value={settingsForm.hero_title || ''}
              onChange={(e) => setSettingsForm({...settingsForm, hero_title: e.target.value})}
              placeholder="地域で支える、人生に寄り添う。"
              className="h-20"
            />
          </div>
          <div>
            <Label>ヒーロー説明文</Label>
            <Input
              value={settingsForm.hero_subtitle || ''}
              onChange={(e) => setSettingsForm({...settingsForm, hero_subtitle: e.target.value})}
              placeholder="タイミー的単発・短時間から参加できるお仕事"
            />
          </div>
          <div>
            <Label>ヒーロー詳細説明</Label>
            <Textarea
              value={settingsForm.hero_description || ''}
              onChange={(e) => setSettingsForm({...settingsForm, hero_description: e.target.value})}
              placeholder="おんくりの輪は、介護から葬祭まで人生のすべての節目に寄り添う地域密着型のワーク＆サポートプラットフォームです。"
              className="h-20"
            />
          </div>
          <div>
            <Label>CTA（行動喚起）テキスト</Label>
            <Input
              value={settingsForm.cta_text || ''}
              onChange={(e) => setSettingsForm({...settingsForm, cta_text: e.target.value})}
              placeholder="おんくりの輪で一緒に働きませんか？"
            />
          </div>
          <div>
            <Label>フッターテキスト</Label>
            <Input
              value={settingsForm.footer_text || ''}
              onChange={(e) => setSettingsForm({...settingsForm, footer_text: e.target.value})}
              placeholder="石狩市を拠点とした地域密着型介護・生活支援事業体"
            />
          </div>
        </div>
      </Card>

      <Card className="border-0 shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-lg font-medium">勤怠締日設定</h2>
        </div>
        <div className="p-6 space-y-4 max-w-2xl">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Label className="text-sm font-medium text-amber-800 mb-3 block">締日（毎月何日締め）</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSettingsForm({...settingsForm, attendance_close_day: 0})}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  (settingsForm.attendance_close_day || 0) === 0
                    ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-[#2D4A6F]'
                }`}
              >
                月末締め
              </button>
              {[5,10,15,20,25].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSettingsForm({...settingsForm, attendance_close_day: d})}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    (settingsForm.attendance_close_day || 0) === d
                      ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-[#2D4A6F]'
                  }`}
                >
                  {d}日締め
                </button>
              ))}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">その他:</span>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={(settingsForm.attendance_close_day || 0) !== 0 && ![5,10,15,20,25].includes(settingsForm.attendance_close_day || 0) ? settingsForm.attendance_close_day : ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v) && v >= 1 && v <= 28) setSettingsForm({...settingsForm, attendance_close_day: v});
                  }}
                  placeholder="1〜28"
                  className="w-20 h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#2D4A6F]"
                />
                <span className="text-sm text-slate-500">日締め</span>
              </div>
            </div>
            <p className="text-xs text-amber-700 mt-3">
              現在の設定: <strong>{(settingsForm.attendance_close_day || 0) === 0 ? '月末締め（毎月末日）' : `毎月${settingsForm.attendance_close_day}日締め`}</strong>
              　→　勤怠締め処理画面の対象期間に自動反映されます
            </p>
          </div>
          <Button onClick={onSave} className="bg-[#2D4A6F]" disabled={isSaving}>
            {isSaving ? '保存中...' : '締日設定を保存'}
          </Button>
        </div>
      </Card>

      <Card className="border-0 shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-lg font-medium">プライバシー・表示設定</h2>
        </div>
        <div className="p-6 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-sm text-slate-800">勤怠画面：全体カレンダー表示</p>
              <p className="text-xs text-slate-500 mt-0.5">スタッフが全員の勤怠（シフト）を閲覧できるようにする</p>
            </div>
            <Switch
              checked={!!settingsForm.show_all_attendance_calendar}
              onCheckedChange={(v) => setSettingsForm({...settingsForm, show_all_attendance_calendar: v})}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-sm text-slate-800">シフト画面：全体シフト表示</p>
              <p className="text-xs text-slate-500 mt-0.5">スタッフが全員のシフトを閲覧できるようにする</p>
            </div>
            <Switch
              checked={!!settingsForm.show_all_shift_calendar}
              onCheckedChange={(v) => setSettingsForm({...settingsForm, show_all_shift_calendar: v})}
            />
          </div>
          <Button onClick={onSave} className="bg-[#2D4A6F]" disabled={isSaving}>
            {isSaving ? '保存中...' : '設定を保存'}
          </Button>
        </div>
      </Card>

      <Card className="border-0 shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-lg font-medium">ダッシュボード右側情報セクション</h2>
        </div>
        <div className="p-6 space-y-6 max-w-2xl">
          <div className="space-y-4 p-4 bg-[#2D4A6F]/5 rounded-lg">
            <h3 className="font-medium text-sm text-slate-800">QR勤怠打刻セクション</h3>
            <div>
              <Label>タイトル</Label>
              <Input
                value={settingsForm.info_qr_title || ''}
                onChange={(e) => setSettingsForm({...settingsForm, info_qr_title: e.target.value})}
                placeholder="勤怠打刻方法"
              />
            </div>
            <div>
              <Label>説明文</Label>
              <Textarea
                value={settingsForm.info_qr_description || ''}
                onChange={(e) => setSettingsForm({...settingsForm, info_qr_description: e.target.value})}
                placeholder="勤務開始時・終了時に、事業所内に設置されたQRコードを読み取ってください。"
                className="h-24"
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-[#FF6B6B]/5 rounded-lg">
            <h3 className="font-medium text-sm text-slate-800">ヘルプコール設定</h3>
            <div>
              <Label>デフォルト必要人数</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={settingsForm.help_call_default_required_count || 1}
                onChange={(e) => setSettingsForm({...settingsForm, help_call_default_required_count: parseInt(e.target.value) || 1})}
              />
              <p className="text-xs text-slate-400 mt-1">新しいヘルプコール作成時のデフォルト必要人数</p>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-[#E8A4B8]/5 rounded-lg">
            <h3 className="font-medium text-sm text-slate-800">サンクス制度セクション</h3>
            <div>
              <Label>タイトル</Label>
              <Input
                value={settingsForm.info_thanks_title || ''}
                onChange={(e) => setSettingsForm({...settingsForm, info_thanks_title: e.target.value})}
                placeholder="感謝が見える仕組み"
              />
            </div>
            <div>
              <Label>説明文</Label>
              <Textarea
                value={settingsForm.info_thanks_description || ''}
                onChange={(e) => setSettingsForm({...settingsForm, info_thanks_description: e.target.value})}
                placeholder="チップは、利用者・ご家族・事業所からの評価に基づき、不定期で付与されます。"
                className="h-20"
              />
            </div>
            <div>
              <Label>項目リスト（1行1項目）</Label>
              <Textarea
                value={(settingsForm.info_thanks_items || []).join('\n')}
                onChange={(e) => setSettingsForm({...settingsForm, info_thanks_items: e.target.value.split('\n').filter(Boolean)})}
                placeholder="現場貢献スペシャルサンクス&#10;感謝還元サンクスギフト&#10;人財穴埋めサンクス"
                className="h-24 font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-[#7CB342]/5 rounded-lg">
            <h3 className="font-medium text-sm text-slate-800">福利厚生制度セクション</h3>
            <div>
              <Label>タイトル</Label>
              <Input
                value={settingsForm.info_benefits_title || ''}
                onChange={(e) => setSettingsForm({...settingsForm, info_benefits_title: e.target.value})}
                placeholder="福利厚生制度"
              />
            </div>
            <div>
              <Label>説明文</Label>
              <Textarea
                value={settingsForm.info_benefits_description || ''}
                onChange={(e) => setSettingsForm({...settingsForm, info_benefits_description: e.target.value})}
                placeholder="働く人の人生の質を高める福利厚生制度を整えています。"
                className="h-20"
              />
            </div>
            <div>
              <Label>項目リスト（1行1項目）</Label>
              <Textarea
                value={(settingsForm.info_benefits_items || []).join('\n')}
                onChange={(e) => setSettingsForm({...settingsForm, info_benefits_items: e.target.value.split('\n').filter(Boolean)})}
                placeholder="エステ／リラクゼーション利用券&#10;カーシェアサービス利用権"
                className="h-32 font-mono text-sm"
              />
            </div>
          </div>

          <Button
            onClick={onSave}
            className="bg-[#2D4A6F]"
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '設定を保存'}
          </Button>
        </div>
      </Card>
    </div>
  );
}