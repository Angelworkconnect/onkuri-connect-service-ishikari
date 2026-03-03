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
    const headers = ['ID', 'クライアントID', '名前', '性別', '電話', '住所', '車椅子', '備考', '利用曜日', 'ステータス', '登録日'];
    const rows = allClients.map(c => [
      c.id,
      c.client_id || '-',
      c.name,
      c.gender === 'male' ? '男性' : c.gender === 'female' ? '女性' : 'その他',
      c.phone || '-',
      c.address || '-',
      c.wheelchairRequired ? 'はい' : 'いいえ',
      c.notes || '-',
      c.daysOfWeek?.length > 0 ? c.daysOfWeek.join(',') : '-',
      c.isActive ? '有効' : '無効',
      c.created_date ? new Date(c.created_date).toLocaleDateString('ja-JP') : '-',
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