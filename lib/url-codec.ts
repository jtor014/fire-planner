// URL state codec for immutable sharing and state persistence
// Supports compression, versioning, and backwards compatibility

import { deflate, inflate } from 'pako'

export interface CodecOptions {
  version: string
  compress: boolean
  includeDefaults: boolean
}

const DEFAULT_OPTIONS: CodecOptions = {
  version: '1.0',
  compress: true,
  includeDefaults: false
}

/**
 * Encode state object to URL-safe string
 */
export function encodeState<T>(state: T, options: Partial<CodecOptions> = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  try {
    // Create versioned payload
    const payload = {
      v: opts.version,
      d: state,
      t: Date.now()
    }
    
    let jsonString = JSON.stringify(payload)
    
    if (opts.compress) {
      // Compress using pako (gzip)
      const compressed = deflate(jsonString, { level: 9 })
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(compressed)))
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    }
    
    // Fallback to base64 encoding without compression
    return btoa(jsonString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    
  } catch (error) {
    console.error('Failed to encode state:', error)
    throw new Error('State encoding failed')
  }
}

/**
 * Decode URL-safe string back to state object
 */
export function decodeState<T>(encoded: string, defaultState: T): { state: T; version: string; timestamp: number } {
  try {
    // Restore base64 padding and characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    
    let jsonString: string
    
    try {
      // Try decompression first
      const compressed = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      jsonString = inflate(compressed, { to: 'string' })
    } catch {
      // Fallback to direct base64 decode
      jsonString = atob(base64)
    }
    
    const payload = JSON.parse(jsonString)
    
    // Handle versioned payloads
    if (payload.v && payload.d) {
      return {
        state: payload.d,
        version: payload.v,
        timestamp: payload.t || 0
      }
    }
    
    // Legacy format (no versioning)
    return {
      state: payload,
      version: '0.0',
      timestamp: 0
    }
    
  } catch (error) {
    console.error('Failed to decode state:', error)
    return {
      state: defaultState,
      version: '0.0',
      timestamp: 0
    }
  }
}

/**
 * Generate shareable URL with encoded state
 */
export function generateShareableUrl(state: any, baseUrl: string = window.location.origin): string {
  const encoded = encodeState(state, { compress: true, version: '1.0' })
  const url = new URL('/calculator', baseUrl)
  url.searchParams.set('s', encoded)
  return url.toString()
}

/**
 * Extract state from current URL
 */
export function extractStateFromUrl<T>(defaultState: T): { state: T; version: string; isFromUrl: boolean } {
  if (typeof window === 'undefined') {
    return { state: defaultState, version: '0.0', isFromUrl: false }
  }
  
  const urlParams = new URLSearchParams(window.location.search)
  const encoded = urlParams.get('s')
  
  if (!encoded) {
    return { state: defaultState, version: '0.0', isFromUrl: false }
  }
  
  const decoded = decodeState(encoded, defaultState)
  return {
    state: decoded.state,
    version: decoded.version,
    isFromUrl: true
  }
}

/**
 * Update URL without page reload
 */
export function updateUrlWithState(state: any, replace: boolean = true): void {
  if (typeof window === 'undefined') return
  
  const encoded = encodeState(state, { compress: true, version: '1.0' })
  const url = new URL(window.location.href)
  url.searchParams.set('s', encoded)
  
  if (replace) {
    window.history.replaceState({}, '', url.toString())
  } else {
    window.history.pushState({}, '', url.toString())
  }
}

/**
 * Clear state from URL
 */
export function clearUrlState(): void {
  if (typeof window === 'undefined') return
  
  const url = new URL(window.location.href)
  url.searchParams.delete('s')
  window.history.replaceState({}, '', url.toString())
}

/**
 * Validate state structure for security
 */
export function validateState<T>(state: any, validator: (state: any) => state is T): state is T {
  try {
    return validator(state)
  } catch {
    return false
  }
}

/**
 * State migration utilities for backwards compatibility
 */
export const StateMigrations = {
  '0.0': (state: any) => {
    // Migrate from legacy format
    return {
      ...state,
      version: '1.0'
    }
  },
  
  '1.0': (state: any) => {
    // Current version - no migration needed
    return state
  }
}

/**
 * Apply migrations based on version
 */
export function migrateState<T>(state: any, version: string, targetVersion: string = '1.0'): T {
  let currentState = state
  let currentVersion = version
  
  // Apply migrations in sequence
  const versions = ['0.0', '1.0']
  const startIndex = versions.indexOf(currentVersion)
  const endIndex = versions.indexOf(targetVersion)
  
  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return currentState
  }
  
  for (let i = startIndex; i < endIndex; i++) {
    const migrationKey = versions[i + 1] as keyof typeof StateMigrations
    if (StateMigrations[migrationKey]) {
      currentState = StateMigrations[migrationKey](currentState)
    }
  }
  
  return currentState
}

/**
 * Create download link for state as JSON
 */
export function createDownloadLink(state: any, filename: string = 'fire-plan.json'): string {
  const jsonString = JSON.stringify(state, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  return URL.createObjectURL(blob)
}

/**
 * Parse uploaded JSON file
 */
export function parseUploadedFile<T>(file: File, defaultState: T): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string
        const parsed = JSON.parse(jsonString)
        resolve(parsed)
      } catch (error) {
        reject(new Error('Invalid JSON file'))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}