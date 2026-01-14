/**
 * Version Helpers
 * Utilities for VyOS version detection and feature flag management
 */

/**
 * Parses VyOS version string
 * @param {string} versionData - Raw version data from VyOS
 * @returns {string} Parsed version string
 */
export const parseVersion = (versionData) => {
    if (!versionData || typeof versionData !== 'object') {
        return 'Unknown';
    }

    // VyOS returns version in different formats
    // Try common properties
    if (versionData.version) {
        return versionData.version;
    }

    if (versionData.data && typeof versionData.data === 'string') {
        // Parse from string output
        const match = versionData.data.match(/Version:\s*(.+?)(\n|$)/i);
        if (match) {
            return match[1].trim();
        }
        // Fallback: return first line
        const lines = versionData.data.split('\n');
        if (lines.length > 0) {
            return lines[0].trim();
        }
    }

    return 'Unknown';
};

/**
 * Detects VyOS major version
 * @param {string} version - Version string
 * @returns {string} Major version ('1.4', '1.5', etc.)
 */
export const getMajorVersion = (version) => {
    if (!version || version === 'Unknown') {
        return 'Unknown';
    }

    // Match patterns like "VyOS 1.5", "1.5-rolling", "1.4.0", etc.
    const match = version.match(/1\.\d+/);
    if (match) {
        return match[0];
    }

    return 'Unknown';
};

/**
 * Checks if version is 1.5 or higher
 * @param {string} version - Version string
 * @returns {boolean} True if 1.5+
 */
export const is15Plus = (version) => {
    if (!version || version === 'Unknown') {
        return true; // Assume newer version if unknown
    }

    const major = getMajorVersion(version);

    // Check for 1.5, rolling, stream, or any version >= 1.5
    if (version.includes('1.5') ||
        version.includes('rolling') ||
        version.includes('stream') ||
        major === '1.5' ||
        parseFloat(major) >= 1.5) {
        return true;
    }

    return false;
};

/**
 * Detects available features based on VyOS version
 * @param {string} version - Version string
 * @returns {Object} Feature flags
 */
export const detectFeatures = (version) => {
    const isNewVersion = is15Plus(version);

    return {
        // VyOS 1.5+ features
        hasNewFirewall: isNewVersion,       // New firewall structure (ipv4/ipv6/bridge)
        hasIPv6Firewall: isNewVersion,      // Dedicated IPv6 firewall
        hasNewNAT: isNewVersion,            // New NAT structure
        hasConntrackHelpers: isNewVersion,  // Connection tracking helpers

        // Features available in all supported versions
        hasPolicyRouting: true,             // Policy-based routing
        hasLoadBalancing: true,             // WAN load balancing  
        hasStaticRoutes: true,              // Static routing
        hasDHCP: true,                      // DHCP server
        hasDNS: true,                       // DNS forwarding
        hasSSH: true,                       // SSH service
        hasQoS: true,                       // QoS policies

        // Version info
        version: version,
        majorVersion: getMajorVersion(version),
        isLegacy: !isNewVersion
    };
};

/**
 * Gets user-friendly feature name
 * @param {string} featureKey - Feature flag key
 * @returns {string} User-friendly name
 */
export const getFeatureName = (featureKey) => {
    const names = {
        hasNewFirewall: 'Modern Firewall (VyOS 1.5+)',
        hasIPv6Firewall: 'IPv6 Firewall',
        hasNewNAT: 'Modern NAT (VyOS 1.5+)',
        hasPolicyRouting: 'Policy-Based Routing',
        hasLoadBalancing: 'WAN Load Balancing',
        hasQoS: 'Quality of Service (QoS)',
        hasDHCP: 'DHCP Server',
        hasDNS: 'DNS Forwarding',
        hasSSH: 'SSH Service',
    };

    return names[featureKey] || featureKey;
};

/**
 * Checks if a specific feature is available
 * @param {Object} connection - Connection object with features
 * @param {string} featureKey - Feature flag key to check
 * @returns {boolean} True if feature is available
 */
export const hasFeature = (connection, featureKey) => {
    if (!connection || !connection.features) {
        return true; // Assume feature is available if no feature flags
    }

    return connection.features[featureKey] !== false;
};
