// SNS API Configuration
export const SNS_CONFIG = {
  // SNS Database Server URL - defaults to localhost:3000 if not set
  API_BASE_URL: process.env.NEXT_PUBLIC_SNS_API_URL || 'http://localhost:3000',
  
  // SNS API Endpoints
  ENDPOINTS: {
    SNS: '/api/sns',
    HEALTH: '/health',
    SPACES: '/api/spaces',
    SHOPS: '/api/shops'
  }
} as const

// Helper function to build SNS API URLs
export function buildSnsUrl(path?: string): string {
  const baseUrl = SNS_CONFIG.API_BASE_URL
  const fullEndpoint = path ? `${SNS_CONFIG.ENDPOINTS.SNS}/${path}` : SNS_CONFIG.ENDPOINTS.SNS
  
  return `${baseUrl}${fullEndpoint}`
}

// Helper function to build health check URL
export function buildHealthUrl(): string {
  return `${SNS_CONFIG.API_BASE_URL}${SNS_CONFIG.ENDPOINTS.HEALTH}`
}

// Helper to build Spaces API URLs
export function buildSpacesUrl(spaceId?: string): string {
  const baseUrl = SNS_CONFIG.API_BASE_URL
  const fullEndpoint = spaceId ? `${SNS_CONFIG.ENDPOINTS.SPACES}/${spaceId}` : SNS_CONFIG.ENDPOINTS.SPACES
  return `${baseUrl}${fullEndpoint}`
}

// Helper to build Shops API URLs
export function buildShopsUrl(shopId?: string): string {
  const baseUrl = SNS_CONFIG.API_BASE_URL
  const fullEndpoint = shopId ? `${SNS_CONFIG.ENDPOINTS.SHOPS}/${shopId}` : SNS_CONFIG.ENDPOINTS.SHOPS
  return `${baseUrl}${fullEndpoint}`
}

// Determine if a URL is absolute (http/https)
export function isAbsoluteUrl(url?: string): boolean {
  if (!url) return false
  return /^https?:\/\//i.test(url)
}

// Build full asset URL from a possibly relative path
export function buildAssetUrl(path?: string): string | undefined {
  if (!path) return undefined
  if (isAbsoluteUrl(path)) return path
  const base = SNS_CONFIG.API_BASE_URL.replace(/\/$/, "")
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${base}${normalized}`
}
