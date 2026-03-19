import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allClients = await base44.entities.Client.list('-created_date', 1000);

    // CSV生成
    const headers = ['利用者ID', '名前', 'ふりがな', '性別', '電話', '住所', '要介護度', '朝の送迎', '帰宅の送迎', '車椅子使用', '週の通所回数', '利用曜日', '緊急連絡先名', '緊急連絡先電話', 'アレルギー', '服用中の薬・病歴', '特別対応', '備考', 'ステータス'];
    const rows = allClients.map(c => [
      c.clientCode || '-',
      c.name,
      c.furigana || '-',
      c.gender === 'male' ? '男性' : c.gender === 'female' ? '女性' : 'その他',
      c.phone || '-',
      c.address || '-',
      c.careLevel === 'none' ? '要介護認定なし' : c.careLevel === 'support_1' ? '要支援1' : c.careLevel === 'support_2' ? '要支援2' : c.careLevel === 'care_1' ? '要介護1' : c.careLevel === 'care_2' ? '要介護2' : c.careLevel === 'care_3' ? '要介護3' : c.careLevel === 'care_4' ? '要介護4' : c.careLevel === 'care_5' ? '要介護5' : '-',
      c.pickupRequired ? 'はい' : 'いいえ',
      c.dropoffRequired ? 'はい' : 'いいえ',
      c.wheelchairRequired ? 'はい' : 'いいえ',
      c.frequencyPerWeek || 1,
      c.daysOfWeek?.length > 0 ? c.daysOfWeek.map(d => ['日', '月', '火', '水', '木', '金', '土'][d]).join(',') : '-',
      c.emergencyContactName || '-',
      c.emergencyContactPhone || '-',
      c.allergies || '-',
      c.medicationInfo || '-',
      c.specialNeeds || '-',
      c.notes || '-',
      c.isActive ? '有効' : '無効',
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const bom = '\uFEFF'; // UTF-8 BOM

    return new Response(bom + csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="clients_${new Date().toISOString().split('T')[0]}.csv"`,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});