// localStorage utilities for state persistence and mirroring
// Includes auto-save, version management, and cleanup

const STORAGE_PREFIX = 'fire-calculator'
const CURRENT_VERSION = '1.0'
const MAX_STORED_STATES = 10 // Keep last 10 auto-saves

export interface StoredState<T> {
  state: T
  version: string
  timestamp: number
  checksum: string
  name?: string
}

export interface StorageOptions {
  autoSave: boolean
  saveInterval: number // milliseconds
  maxHistory: number
  compression: boolean
}

const DEFAULT_OPTIONS: StorageOptions = {
  autoSave: true,
  saveInterval: 2000, // 2 seconds
  maxHistory: MAX_STORED_STATES,
  compression: false // localStorage has size limits, but we'll keep it simple
}

/**
 * Generate simple checksum for state validation
 */
function generateChecksum(state: any): string {
  const jsonString = JSON.stringify(state)
  let hash = 0
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(16)
}

/**
 * Storage key generators
 */
const StorageKeys = {
  current: () => `${STORAGE_PREFIX}:current`,
  autoSave: (index: number) => `${STORAGE_PREFIX}:auto:${index}`,
  named: (name: string) => `${STORAGE_PREFIX}:named:${name}`,
  metadata: () => `${STORAGE_PREFIX}:metadata`,
  settings: () => `${STORAGE_PREFIX}:settings`
}

/**
 * Save state to localStorage
 */
export function saveState<T>(
  state: T, 
  name?: string, 
  options: Partial<StorageOptions> = {}
): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false
  }

  try {
    const storedState: StoredState<T> = {
      state,
      version: CURRENT_VERSION,
      timestamp: Date.now(),
      checksum: generateChecksum(state),
      name
    }

    const key = name ? StorageKeys.named(name) : StorageKeys.current()
    localStorage.setItem(key, JSON.stringify(storedState))

    // Update metadata
    updateMetadata(name, storedState.timestamp)

    return true
  } catch (error) {
    console.warn('Failed to save state to localStorage:', error)
    return false
  }
}

/**
 * Load state from localStorage
 */
export function loadState<T>(name?: string, defaultState?: T): StoredState<T> | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  try {
    const key = name ? StorageKeys.named(name) : StorageKeys.current()
    const stored = localStorage.getItem(key)
    
    if (!stored) {
      return null
    }

    const parsedState = JSON.parse(stored) as StoredState<T>

    // Validate checksum
    const expectedChecksum = generateChecksum(parsedState.state)
    if (parsedState.checksum !== expectedChecksum) {
      console.warn('State checksum mismatch - data may be corrupted')
      return null
    }

    return parsedState
  } catch (error) {
    console.warn('Failed to load state from localStorage:', error)
    return null
  }
}

/**
 * Auto-save functionality with debouncing
 */
export class AutoSaver<T> {
  private state: T
  private saveTimer: NodeJS.Timeout | null = null
  private lastSaved: number = 0
  private options: StorageOptions

  constructor(initialState: T, options: Partial<StorageOptions> = {}) {
    this.state = initialState
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  updateState(newState: T): void {
    this.state = newState

    if (!this.options.autoSave) {
      return
    }

    // Clear existing timer
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }

    // Set new timer
    this.saveTimer = setTimeout(() => {
      this.performAutoSave()
    }, this.options.saveInterval)
  }

  private performAutoSave(): void {
    const now = Date.now()
    
    // Don't save too frequently
    if (now - this.lastSaved < this.options.saveInterval) {
      return
    }

    // Rotate auto-save slots
    this.rotateAutoSaves()

    // Save current state
    const success = saveState(this.state)
    
    if (success) {
      this.lastSaved = now
    }
  }

  private rotateAutoSaves(): void {
    try {
      // Shift existing auto-saves
      for (let i = this.options.maxHistory - 1; i > 0; i--) {
        const currentKey = StorageKeys.autoSave(i - 1)
        const nextKey = StorageKeys.autoSave(i)
        
        const currentData = localStorage.getItem(currentKey)
        if (currentData) {
          localStorage.setItem(nextKey, currentData)
        }
      }

      // Save current as auto-save 0
      if (this.state) {
        const autoSaveKey = StorageKeys.autoSave(0)
        const currentKey = StorageKeys.current()
        const currentData = localStorage.getItem(currentKey)
        
        if (currentData) {
          localStorage.setItem(autoSaveKey, currentData)
        }
      }
    } catch (error) {
      console.warn('Failed to rotate auto-saves:', error)
    }
  }

  forceSync(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }
    this.performAutoSave()
  }

  destroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
  }
}

/**
 * Get list of saved states
 */
export function getSavedStates(): Array<{ name: string; timestamp: number }> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return []
  }

  try {
    const metadata = localStorage.getItem(StorageKeys.metadata())
    if (!metadata) {
      return []
    }

    return JSON.parse(metadata)
  } catch (error) {
    console.warn('Failed to load saved states metadata:', error)
    return []
  }
}

/**
 * Update metadata for saved states
 */
function updateMetadata(name: string | undefined, timestamp: number): void {
  if (!name) return // Don't track unnamed saves

  try {
    const existing = getSavedStates()
    const updated = existing.filter(item => item.name !== name)
    updated.unshift({ name, timestamp })
    
    // Keep only recent saves
    const trimmed = updated.slice(0, MAX_STORED_STATES)
    
    localStorage.setItem(StorageKeys.metadata(), JSON.stringify(trimmed))
  } catch (error) {
    console.warn('Failed to update metadata:', error)
  }
}

/**
 * Delete saved state
 */
export function deleteState(name: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false
  }

  try {
    const key = StorageKeys.named(name)
    localStorage.removeItem(key)

    // Update metadata
    const metadata = getSavedStates()
    const updated = metadata.filter(item => item.name !== name)
    localStorage.setItem(StorageKeys.metadata(), JSON.stringify(updated))

    return true
  } catch (error) {
    console.warn('Failed to delete state:', error)
    return false
  }
}

/**
 * Clear all saved states
 */
export function clearAllStates(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false
  }

  try {
    // Remove all fire-calculator keys
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))
    return true
  } catch (error) {
    console.warn('Failed to clear all states:', error)
    return false
  }
}

/**
 * Get storage usage statistics
 */
export function getStorageStats(): {
  used: number
  available: number
  percentage: number
  itemCount: number
} {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { used: 0, available: 0, percentage: 0, itemCount: 0 }
  }

  try {
    let used = 0
    let itemCount = 0

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const value = localStorage.getItem(key)
        if (value) {
          used += key.length + value.length
          itemCount++
        }
      }
    }

    // Estimate available space (localStorage limit is typically 5-10MB)
    const estimated_limit = 5 * 1024 * 1024 // 5MB in bytes
    const available = estimated_limit - used
    const percentage = (used / estimated_limit) * 100

    return {
      used,
      available: Math.max(0, available),
      percentage: Math.min(100, percentage),
      itemCount
    }
  } catch (error) {
    console.warn('Failed to calculate storage stats:', error)
    return { used: 0, available: 0, percentage: 0, itemCount: 0 }
  }
}

/**
 * Export all states as downloadable JSON
 */
export function exportAllStates(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return '{}'
  }

  try {
    const exportData: { [key: string]: any } = {}

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const value = localStorage.getItem(key)
        if (value) {
          exportData[key] = JSON.parse(value)
        }
      }
    }

    return JSON.stringify(exportData, null, 2)
  } catch (error) {
    console.warn('Failed to export states:', error)
    return '{}'
  }
}

/**
 * Import states from JSON
 */
export function importStates(jsonData: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false
  }

  try {
    const data = JSON.parse(jsonData)
    
    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.setItem(key, JSON.stringify(value))
      }
    })

    return true
  } catch (error) {
    console.warn('Failed to import states:', error)
    return false
  }
}