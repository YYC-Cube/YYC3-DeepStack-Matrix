/* YYC³ LeisureManage · Service Worker(PWA 离线壳;零依赖手写,不用 Workbox)
 * 策略:
 *  - 页面导航(HTML):网络优先 → 回退缓存 index.html(SPA hash 路由单壳)
 *  - /assets/*(hash 指纹,内容不可变):缓存优先
 *  - /api/v1 的 GET:网络优先,成功写运行时缓存;离线回缓存;无缓存回 503 JSON 信封(code:-1)
 *  - 图标/manifest:缓存优先
 *  - 非 GET(资金写操作)一律直连,绝不缓存
 * 发版:改 CACHE_VERSION → 旧缓存清理;客户端 controllerchange 自动刷新(见 lib/pwa.ts)
 */
const CACHE_VERSION = 'v1'
const SHELL_CACHE = `leisure-shell-${CACHE_VERSION}`
const RUNTIME_CACHE = `leisure-runtime-${CACHE_VERSION}`

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './yyc3-icons/favicon-32.png',
  './yyc3-icons/macOS/512.png',
  './yyc3-icons/Web%20App/android-chrome-192.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

async function cacheFirst(request, cacheName) {
  const hit = await caches.match(request)
  if (hit !== undefined) return hit
  const res = await fetch(request)
  if (res !== undefined && res.ok) {
    const cache = await caches.open(cacheName)
    cache.put(request, res.clone())
  }
  return res
}

async function networkFirst(request, cacheName, fallback) {
  try {
    const res = await fetch(request)
    if (res.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, res.clone())
    }
    return res
  } catch (err) {
    const hit = await caches.match(request)
    if (hit !== undefined) return hit
    if (fallback !== undefined) return fallback
    throw err
  }
}

/**
 * API GET 专用:stale-while-revalidate
 * 有缓存 → 立即回缓存(页面秒开),后台静默拉新更新缓存;无缓存 → 等网络。
 * 注意:页面拿到的是上一瞬间的数据;写操作后由前端主动重新拉取/刷新页面。
 */
async function apiStaleWhileRevalidate(request, cacheName, fallback) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone())
      return res
    })
    .catch(() => undefined)
  if (cached !== undefined) return cached
  const res = await network
  if (res !== undefined) return res
  return fallback
}

function apiOfflineFallback() {
  return new Response(JSON.stringify({ code: -1, msg: '离线模式:网络不可用,请恢复后重试' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function handleFetch(event) {
  const request = event.request
  const url = new URL(request.url)

  // 页面导航:网络优先 → 缓存壳
  if (request.mode === 'navigate') {
    const offlineShell = (await caches.match('./index.html')) || new Response('离线', { status: 503 })
    return networkFirst(request, SHELL_CACHE, offlineShell)
  }

  if (request.method !== 'GET') return fetch(request)
  if (url.origin !== self.location.origin) return fetch(request)

  // API:GET stale-while-revalidate(缓存秒开+后台拉新)+ 离线信封;写操作直连
  if (url.pathname.startsWith('/api/v1/')) {
    return apiStaleWhileRevalidate(request, RUNTIME_CACHE, apiOfflineFallback())
  }

  // hash 指纹构建产物:缓存优先(不可变)
  if (url.pathname.startsWith('/assets/')) {
    return cacheFirst(request, RUNTIME_CACHE)
  }

  // 图标/manifest/favicon:缓存优先
  if (
    url.pathname.startsWith('/yyc3-icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.startsWith('/icons/')
  ) {
    return cacheFirst(request, SHELL_CACHE)
  }

  return fetch(request)
}

self.addEventListener('fetch', (event) => {
  event.respondWith(handleFetch(event))
})
