// This backend file runs automatically on Cloudflare whenever your app saves or loads data
export async function onRequest(context) {
  const { request, env } = context;
  
  // Enforce CORS cross-origin access permissions
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. LOADING HIKES (GET Request)
    if (request.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM hikes ORDER BY date DESC"
      ).all();
      
      // Convert stored text strings back into standard coordinate arrays
      const formattedResults = results.map(hike => ({
        ...hike,
        coordinates: hike.coordinates ? JSON.parse(hike.coordinates) : []
      }));

      return new Response(JSON.stringify(formattedResults), { headers: corsHeaders });
    }

    // 2. SAVING A NEW HIKE (POST Request)
    if (request.method === "POST") {
      const data = await request.json();
      const { id, date, type, notes, coordinates } = data;

      await env.DB.prepare(
        "INSERT INTO hikes (id, date, type, notes, coordinates) VALUES (?, ?, ?, ?, ?)"
      ).bind(id, date, type, notes, JSON.stringify(coordinates)).run();

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}
