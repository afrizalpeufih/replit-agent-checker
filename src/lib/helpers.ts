// Pure helper functions extracted from Index component for better performance and reusability

/**
 * Validate phone number prefix
 * Checks if number starts with 0895, 0896, 0897, 0898, or 0899
 */
export const isValidPhoneNumber = (number: string): boolean => {
    const cleanNumber = number.trim();
    const validPrefixes = ['0895', '0896', '0897', '0898', '0899'];
    return validPrefixes.some(prefix => cleanNumber.startsWith(prefix));
};

/**
 * Validate voucher serial number
 * Must start with 350 and be max 12 digits
 */
export const isValidVoucherSerial = (serial: string): boolean => {
    const cleanSerial = serial.trim();
    // User requested free format, only number requirement remains
    return /^\d+$/.test(cleanSerial);
};

/**
 * Network quality detection
 * Uses Navigator Connection API when available, falls back to user agent detection
 */
export const getNetworkQuality = (): 'fast' | 'slow' | 'offline' => {
    if (!navigator.onLine) return 'offline';

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    if (connection) {
        const type = connection.effectiveType;
        const downlink = connection.downlink;

        if (type === '4g' || downlink > 5) return 'fast';
        if (type === '3g' || downlink > 1) return 'slow';
        return 'slow';
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile ? 'slow' : 'fast';
};

/**
 * Get optimal network settings based on detected network quality
 */
export const getOptimalSettings = () => {
    const quality = getNetworkQuality();

    switch (quality) {
        case 'fast':
            return { BATCH_SIZE: 5, CONCURRENCY: 10, TIMEOUT: 10000, RETRY_DELAY: 1000, MAX_RETRIES: 2 };
        case 'slow':
            return { BATCH_SIZE: 3, CONCURRENCY: 3, TIMEOUT: 30000, RETRY_DELAY: 2000, MAX_RETRIES: 3 };
        case 'offline':
            return null;
    }
};

/**
 * Generate sequential serial numbers from start to end
 */
export const generateSequentialSerials = (startSerial: string, endSerial: string): string[] => {
    const start = parseInt(startSerial.trim());
    const end = parseInt(endSerial.trim());

    if (isNaN(start) || isNaN(end)) {
        return [];
    }

    if (start > end) {
        return [];
    }

    const serials: string[] = [];
    for (let i = start; i <= end; i++) {
        serials.push(i.toString());
    }

    return serials;
};

/**
 * Create batches from array
 */
export const createBatches = <T,>(items: T[], batchSize: number): T[][] => {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }
    return batches;
};

/**
 * Fetch with timeout support
 */
export const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> => {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

    try {
        // Merge signals: use existing signal if provided, otherwise use timeout signal
        const existingSignal = options.signal;
        let finalSignal = timeoutController.signal;

        // If caller provided a signal, we need to merge both signals
        if (existingSignal) {
            // Listen to both signals - abort if either one triggers
            const abortHandler = () => {
                if (!timeoutController.signal.aborted) {
                    timeoutController.abort();
                }
            };
            existingSignal.addEventListener('abort', abortHandler, { once: true });

            // Use the existing signal, but also respect timeout
            finalSignal = existingSignal;
        }

        const response = await fetch(url, {
            ...options,
            signal: finalSignal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

/**
 * Wait for online connection
 * Returns a promise that resolves when connection is restored
 */
const waitForConnection = (): Promise<void> => {
    return new Promise((resolve) => {
        if (navigator.onLine) {
            resolve();
            return;
        }

        const handleOnline = () => {
            window.removeEventListener('online', handleOnline);
            resolve();
        };

        window.addEventListener('online', handleOnline);
    });
};

/**
 * Fetch with retry and exponential backoff + jitter
 * Now includes connection detection - waits for online before each attempt
 */
export const fetchWithRetry = async (
    url: string,
    options: RequestInit,
    maxRetries = 2,
    timeoutMs = 30000,
    baseDelay = 1000
): Promise<Response> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        // Wait for connection before attempting fetch
        await waitForConnection();

        try {
            const response = await fetchWithTimeout(url, options, timeoutMs);

            // Retry on specific HTTP status codes
            if (
                (response.status === 429 ||
                    response.status === 503 ||
                    response.status >= 500) &&
                attempt < maxRetries
            ) {
                const exponentialDelay = baseDelay * Math.pow(2, attempt);
                const jitter = Math.random() * 1000; // Random 0-1000ms
                const delay = Math.min(exponentialDelay + jitter, 10000);
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
            }

            return response;
        } catch (error: any) {
            // Check if we're offline - wait for connection
            if (!navigator.onLine) {
                await waitForConnection();
                // Reset attempt to retry from current position
                attempt--;
                continue;
            }

            if (error.name === 'AbortError' || attempt >= maxRetries) {
                throw error;
            }

            // Exponential backoff with jitter for network errors
            const exponentialDelay = baseDelay * Math.pow(2, attempt);
            const jitter = Math.random() * 1000;
            const delay = Math.min(exponentialDelay + jitter, 10000);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw new Error('Retry failed');
};

/**
 * Parse token input with # delimiter
 * Returns array of unique, trimmed tokens
 */
export const parseTokenInput = (input: string): string[] => {
    if (!input || !input.trim()) return [];

    // Split by # delimiter, trim each token, remove empty strings
    const tokens = input
        .split('#')
        .map(token => token.trim())
        .filter(token => token.length > 0);

    // Remove duplicates
    return Array.from(new Set(tokens));
};

/**
 * Get token for a specific batch using round-robin distribution
 * Ensures even distribution of tokens across batches
 */
export const getTokenForBatch = (validTokens: string[], batchIndex: number): string => {
    if (!validTokens || validTokens.length === 0) {
        throw new Error('No valid tokens available');
    }

    return validTokens[batchIndex % validTokens.length];
};
