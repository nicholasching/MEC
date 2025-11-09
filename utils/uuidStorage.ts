import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const UUID_STORAGE_KEY = '@ble_relay:device_uuid_suffix';
const BASE_UUID_PREFIX = '2a5af6cd-0255-4884-b889';

/**
 * Generate a random 12-character hexadecimal string (6 bytes)
 * This will be used as the suffix for the UUID
 */
function generateRandomHexSuffix(): string {
  // Generate 12 random hex characters (6 bytes)
  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < 6; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  
  // Convert to hex string and pad to 12 characters
  // Format: xxxxxxxxxxxx (12 hex chars)
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toLowerCase();
}

/**
 * Get or generate the device-specific UUID suffix
 * This is stored persistently so each device has a stable UUID
 */
export async function getDeviceUuidSuffix(): Promise<string> {
  try {
    // Try to get existing suffix from storage
    const storedSuffix = await AsyncStorage.getItem(UUID_STORAGE_KEY);
    if (storedSuffix) {
      console.log('✅ Found stored UUID suffix:', storedSuffix);
      return storedSuffix;
    }

    // Generate new suffix if not found
    const newSuffix = generateRandomHexSuffix();
    await AsyncStorage.setItem(UUID_STORAGE_KEY, newSuffix);
    console.log('✅ Generated new UUID suffix:', newSuffix);
    return newSuffix;
  } catch (error) {
    console.error('Error getting UUID suffix:', error);
    // Fallback to generating a new one (won't persist but will work)
    return generateRandomHexSuffix();
  }
}

/**
 * Get the full device-specific service UUID
 * Format: 2a5af6cd-0255-4884-b889-{random_suffix}
 */
export async function getDeviceServiceUuid(): Promise<string> {
  const suffix = await getDeviceUuidSuffix();
  // Format UUID with proper dashes: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  // We have: 2a5af6cd-0255-4884-b889 and need to add -{12 hex chars}
  return `${BASE_UUID_PREFIX}-${suffix}`;
}

/**
 * Get the device-specific characteristic UUID
 * Uses the same base but changes the last character of the suffix for the characteristic
 */
export async function getDeviceCharacteristicUuid(): Promise<string> {
  const suffix = await getDeviceUuidSuffix();
  // Change the last character to create a different UUID for the characteristic
  // This ensures it's unique but related to the service UUID
  const charSuffix = suffix.slice(0, -1) + (suffix.slice(-1) === 'a' ? 'b' : 'a');
  return `${BASE_UUID_PREFIX}-${charSuffix}`;
}

/**
 * Synchronous version that uses a cached value
 * Call initializeUuidCache() first to populate the cache
 */
let uuidSuffixCache: string | null = null;

/**
 * Initialize the UUID cache (call this early in app startup)
 */
export async function initializeUuidCache(): Promise<string> {
  if (!uuidSuffixCache) {
    uuidSuffixCache = await getDeviceUuidSuffix();
  }
  return uuidSuffixCache;
}

/**
 * Get the cached UUID suffix (synchronous)
 * Returns null if cache hasn't been initialized
 */
export function getCachedUuidSuffix(): string | null {
  return uuidSuffixCache;
}

/**
 * Get the full service UUID using cached suffix (synchronous)
 * Returns a default UUID if cache hasn't been initialized
 */
export function getCachedServiceUuid(): string {
  const suffix = uuidSuffixCache || '000000000000';
  return `${BASE_UUID_PREFIX}-${suffix}`;
}

/**
 * Get the characteristic UUID using cached suffix (synchronous)
 */
export function getCachedCharacteristicUuid(): string {
  const suffix = uuidSuffixCache || '000000000000';
  // Change the last character to create a different UUID for the characteristic
  const charSuffix = suffix.slice(0, -1) + (suffix.slice(-1) === 'a' ? 'b' : 'a');
  return `${BASE_UUID_PREFIX}-${charSuffix}`;
}

