import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Check if user is temporary staff
    const staffList = await base44.entities.Staff.filter({ email: user.email });
    if (staffList.length > 0 && staffList[0].role === 'temporary') {
      return Response.json(
        { error: '単発スタッフは福利厚生サービスの申請ができません' },
        { status: 403 }
      );
    }

    // Create the benefit application
    const result = await base44.entities.BenefitApplication.create({
      user_email: user.email,
      user_name: user.full_name,
      benefit_id: body.benefit_id,
      request_date: body.request_date,
      notes: body.notes || '',
      status: 'pending',
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});