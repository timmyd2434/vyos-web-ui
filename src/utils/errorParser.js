/**
 * Error Parser
 * Translates VyOS error messages into user-friendly text
 */

/**
 * Parses VyOS error responses and returns user-friendly messages
 * @param {Error} error - Error object from API call
 * @returns {string} User-friendly error message
 */
export const parseVyOSError = (error) => {
    // Handle network errors first
    if (error.code === 'ECONNABORTED') {
        return 'Request timeout - The router is not responding. Check your connection and try again.';
    }

    if (error.code === 'ERR_NETWORK') {
        return 'Network error - Unable to reach the router. Verify the router URL and your network connection.';
    }

    if (error.code === 'ETIMEDOUT') {
        return 'Connection timeout - The router took too long to respond. It may be busy or unreachable.';
    }

    // Handle HTTP status codes
    if (error.response) {
        const status = error.response.status;

        switch (status) {
            case 401:
                return 'Authentication failed - Your API key is invalid or expired. Please log in again.';
            case 403:
                return 'Access denied - You do not have permission to perform this action.';
            case 404:
                return 'Not found - The requested configuration path does not exist on the router.';
            case 500:
                return 'Router error - The VyOS router encountered an internal error. Check router logs for details.';
            case 503:
                return 'Service unavailable - The router API service is not responding. The router may be restarting.';
        }
    }

    // Parse VyOS-specific error messages from response data
    if (error.response?.data?.error) {
        const vyosError = error.response.data.error;

        // Configuration path errors
        if (vyosError.includes('Configuration path') || vyosError.includes('path is empty')) {
            return 'Configuration not found - This setting does not exist or has no value configured.';
        }

        // Commit errors
        if (vyosError.includes('Commit failed')) {
            return `Failed to apply configuration: ${extractVyOSDetail(vyosError)}. Review your changes and try again.`;
        }

        // Validation errors
        if (vyosError.includes('already exists')) {
            return 'This configuration already exists. Use edit to modify it instead of creating a new one.';
        }

        if (vyosError.includes('not found') || vyosError.includes('does not exist')) {
            return 'Configuration item not found. It may have been deleted or never existed.';
        }

        if (vyosError.includes('Invalid value')) {
            return `Invalid value: ${extractVyOSDetail(vyosError)}. Check the format and try again.`;
        }

        if (vyosError.includes('requires') || vyosError.includes('must be')) {
            return `Configuration requirement not met: ${extractVyOSDetail(vyosError)}`;
        }

        // Dependency errors
        if (vyosError.includes('depends on') || vyosError.includes('dependency')) {
            return `Missing dependency: ${extractVyOSDetail(vyosError)}. Configure required settings first.`;
        }

        // Protocol/port errors
        if (vyosError.includes('protocol') && vyosError.includes('port')) {
            return 'Port configuration requires a protocol (TCP or UDP) to be specified.';
        }

        // Range errors
        if (vyosError.includes('out of range') || vyosError.includes('must be between')) {
            return `Value out of range: ${extractVyOSDetail(vyosError)}`;
        }

        // Return the raw VyOS error if we can't parse it nicely
        return `VyOS Error: ${vyosError}`;
    }

    // Fallback for unknown errors
    return error.message || 'An unknown error occurred. Please try again or check the router logs.';
};

/**
 * Extracts the most relevant detail from a VyOS error message
 * @param {string} errorMsg - Full VyOS error message
 * @returns {string} Extracted detail
 */
const extractVyOSDetail = (errorMsg) => {
    // Try to extract quoted values or specific details
    const quotedMatch = errorMsg.match(/["']([^"']+)["']/);
    if (quotedMatch) {
        return quotedMatch[1];
    }

    // Try to extract everything after a colon
    const colonMatch = errorMsg.match(/:\s*(.+)$/);
    if (colonMatch) {
        return colonMatch[1].trim();
    }

    // Return first sentence
    const sentences = errorMsg.split('.');
    return sentences[0].trim();
};

/**
 * Gets a user-friendly suggestion based on error type
 * @param {Error} error - Error object
 * @returns {string|null} Suggestion text or null
 */
export const getErrorSuggestion = (error) => {
    const errorMsg = error.response?.data?.error?.toLowerCase() || error.message?.toLowerCase() || '';

    if (errorMsg.includes('timeout')) {
        return 'Try again in a few moments. If the problem persists, check the router\'s network connectivity.';
    }

    if (errorMsg.includes('commit failed')) {
        return 'Review your pending changes and ensure all required fields are filled. You may need to discard and reconfigure.';
    }

    if (errorMsg.includes('protocol') && errorMsg.includes('port')) {
        return 'When specifying ports, make sure to select TCP or UDP as the protocol.';
    }

    if (errorMsg.includes('already exists')) {
        return 'Check if this item is already configured. You may need to edit the existing item instead.';
    }

    if (errorMsg.includes('depends on') || errorMsg.includes('requires')) {
        return 'Some configurations require other settings to be configured first. Review the VyOS documentation for dependencies.';
    }

    if (errorMsg.includes('authentication') || errorMsg.includes('401')) {
        return 'Log out and log back in with a valid API key.';
    }

    return null;
};
