// Vercel Edge Function для проксирования Supabase
// Деплой: создайте файл api/proxy.js в проекте Vercel

const SUPABASE_URL = 'https://umkezjtthrvfxblvqqyc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_g6guBWgy3uNy2NUYlHncbA_cuOPqhU7';
const CACHE_TTL = 300; // 5 минут

export default async function handler(request) {
  const url = new URL(request.url);
  const cacheKey = `${request.method}:${url.pathname}:${url.search}`;
  
  // Обрабатываем CORS preflight запросы
  if (request.method === 'OPTIONS') {
    return handleCORS();
  }
  
  // Кэшируем только GET запросы
  if (request.method === 'GET') {
    const cache = caches.default;
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse) {
      console.log(`Cache HIT: ${request.method} ${url.pathname}`);
      return cachedResponse;
    }
    
    console.log(`Cache MISS: ${request.method} ${url.pathname}`);
  }
  
  // Проксируем запрос в Supabase
  const supabaseUrl = `${SUPABASE_URL}${url.pathname}${url.search}`;
  const proxyRequest = new Request(supabaseUrl, request);
  
  // Добавляем заголовки Supabase
  proxyRequest.headers.set('apikey', SUPABASE_ANON_KEY);
  proxyRequest.headers.set('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
  
  // Удаляем заголовки host и другие, которые могут вызвать проблемы
  proxyRequest.headers.delete('host');
  
  try {
    const response = await fetch(proxyRequest);
    
    // Создаем новый ответ с CORS заголовками
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
    
    // Кэшируем успешные GET ответы
    if (request.method === 'GET' && response.ok) {
      newResponse.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
      const cache = caches.default;
      await cache.put(cacheKey, newResponse.clone());
    }
    
    return newResponse;
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export const config = {
  runtime: 'edge'
};
