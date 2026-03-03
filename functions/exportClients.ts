import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allClients = await base44.entities.Client.list('-created_date', 1000);

    // CSV生成
    const headers = ['名前', '性別', '電話', '住所', '朝送迎', '帰送迎', '車椅子', '週回数', '利用曜日', '緊急連絡先名', '緊急連絡先電話', 'アレルギー', '服用薬・病歴', '特別対応', '備考', 'ステータス'];
    const rows = allClients.map(c => [
      c.name,
      c.gender === 'male' ? '男性' : c.gender === 'female' ? '女性' : 'その他',
      c.phone || '-',
      c.address || '-',
      c.pickupRequired ? 'はい' : 'いいえ',
      c.dropoffRequired ? 'はい' : 'いいえ',
      c.wheelchairRequired ? 'はい' : 'いいえ',
      c.frequencyPerWeek || 1,
      c.daysOfWeek?.length > 0 ? c.daysOfWeek.join(',') : '-',
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