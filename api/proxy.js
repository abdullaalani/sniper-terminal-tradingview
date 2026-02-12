export default async function handler(req, res) {
  // 1. Allow the browser to talk to this function (CORS fix)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-MBX-APIKEY');

  // 2. Handle browser pre-checks
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Get the path we want to call on Binance
  const { path } = req.query; 
  
  // 4. Send the request to Binance from the Server (No CORS here!)
  try {
    const response = await fetch(`https://api.binance.com${path}`, {
      method: req.method,
      headers: {
        'X-MBX-APIKEY': req.headers['x-mbx-apikey'] || '',
        'Content-Type': 'application/json'
      },
      // Only include body for POST/PUT requests
      body: (req.method === 'POST' || req.method === 'PUT') ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    
    // Check if Binance sent an error
    if (data.code && data.msg) {
        return res.status(400).json(data);
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy connection failed' });
  }
}