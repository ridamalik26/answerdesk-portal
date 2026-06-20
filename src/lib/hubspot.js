const HUBSPOT_API_URL = 'https://api.hubapi.com/crm/v3/objects/contacts';

export async function createHubSpotContact(clientData) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    console.warn('[hubspot] HUBSPOT_ACCESS_TOKEN is not set — skipping contact creation.');
    return { skipped: true };
  }

  const { contact_name = '', email, phone, business_name, plan_name } = clientData;

  // Split contact_name into first / last
  const parts     = contact_name.trim().split(/\s+/);
  const firstName = parts[0] ?? '';
  const lastName  = parts.slice(1).join(' ') ?? '';

  const payload = {
    properties: {
      firstname: firstName,
      lastname:  lastName,
      email,
      phone:     phone ?? '',
      company:   business_name ?? '',
    },
  };

  const res = await fetch(HUBSPOT_API_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok) {
    console.error('[hubspot] HTTP', res.status, '— full response:', JSON.stringify(json, null, 2));
    return { error: json?.message ?? 'HubSpot API error', status: res.status };
  }

  console.log('[hubspot] Contact created, id:', json.id);
  return { hubspotId: json.id };
}
