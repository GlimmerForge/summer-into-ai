export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { companyName } = body;

  if (!companyName || !companyName.trim()) {
    return res.status(400).json({ error: 'Company name is required.' });
  }

  const searchBody = {
    filters: {
      recipient_search_text: [companyName.trim()],
      time_period: [{ start_date: '2022-01-01', end_date: '2025-12-31' }],
      award_type_codes: ['A', 'B', 'C', 'D']
    },
    fields: [
      'Award Amount',
      'Recipient Name',
      'Awarding Agency Name',
      'Awarding Sub Agency Name',
      'Description',
      'Award Type',
      'Period of Performance Start Date',
      'Period of Performance Current End Date',
      'Place of Performance City Name',
      'Place of Performance State Code',
      'generated_internal_id'
    ],
    sort: 'Award Amount',
    order: 'desc',
    limit: 25,
    page: 1
  };

  let respData;
  try {
    const resp = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchBody)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('USASpending error:', resp.status, errText);
      return res.status(502).json({ error: 'USASpending.gov API error. Please try again.' });
    }

    respData = await resp.json();
  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(502).json({ error: 'Failed to reach USASpending.gov. Please try again.' });
  }

  const results = respData.results || [];

  if (results.length === 0) {
    return res.status(200).json({
      error: `No federal contracts found for '${companyName}'. Try variations of the name (e.g., 'Boeing' instead of 'The Boeing Company').`
    });
  }

  // Calculate total obligated and build agency map
  let totalObligated = 0;
  const agencyCounts = {};
  const topAgencies = {};

  const awards = results.map(r => {
    const amount = parseFloat(r['Award Amount']) || 0;
    totalObligated += amount;

    let agency = r['Awarding Agency Name'];
    if (!agency && r['generated_internal_id']) {
      agency = 'Federal Government';
    }
    agency = agency || 'Federal Government';

    agencyCounts[agency] = (agencyCounts[agency] || 0) + 1;
    topAgencies[agency] = (topAgencies[agency] || 0) + amount;

    return {
      amount,
      recipient: r['Recipient Name'] || companyName.toUpperCase(),
      agency,
      subAgency: r['Awarding Sub Agency Name'] || '',
      description: r['Description'] || 'Contract award',
      type: r['Award Type'] || 'Contract',
      startDate: r['Period of Performance Start Date'] || '',
      endDate: r['Period of Performance Current End Date'] || '',
      city: r['Place of Performance City Name'] || '',
      state: r['Place of Performance State Code'] || ''
    };
  });

  // Sort topAgencies by total amount desc
  const sortedAgencies = Object.entries(topAgencies)
    .sort((a, b) => b[1] - a[1])
    .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});

  return res.status(200).json({
    company: companyName.trim().toUpperCase(),
    totalAwards: respData.page_metadata?.total || results.length,
    awards,
    totalObligated,
    topAgencies: sortedAgencies
  });
}
