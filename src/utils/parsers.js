/**
 * Parses 'show interfaces' or 'show interfaces operational' output.
 * Handles VyOS 1.5+ style output with variable columns.
 */
export const parseShowInterfaces = (text) => {
    if (!text || typeof text !== 'string') return [];

    const lines = text.split('\n');
    const interfaces = [];

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Skip headers / legends
        if (trimmed.startsWith('Codes:') || trimmed.startsWith('Interface') || trimmed.startsWith('-----') || trimmed.startsWith('default')) return;

        // Strategy: Identifying the "S/L" column is key. It usually looks like u/u, u/D, A/D.
        const slMatch = trimmed.match(/\s([uAD]\/[uAD])(\s|$)/);
        if (!slMatch) return;

        const statusLine = slMatch[1];
        const statusIndex = slMatch.index;

        // Everything before S/L
        const preStatus = trimmed.substring(0, statusIndex).trim();
        // Everything after S/L
        const description = trimmed.substring(statusIndex + slMatch[0].length).trim();

        // Parse preStatus parts. It should be: Name [SPACE] IP [SPACE] [Optional MAC/VRF/MTU]
        const parts = preStatus.split(/\s+/);
        if (parts.length < 2) return;

        const name = parts[0];
        const addressRaw = parts[1];

        // Basic validation
        if (name === 'Interface') return;

        interfaces.push({
            name: name,
            address: addressRaw === '-' ? [] : addressRaw.split(','),
            statusLine: statusLine,
            state: statusLine.toLowerCase().startsWith('u') ? 'up' : 'down',
            link: statusLine.toLowerCase().endsWith('u') ? 'up' : 'down',
            description: description
        });
    });

    return interfaces;
};

/**
 * Parses 'show version' or 'show system image' output
 */
export const parseVersion = (text) => {
    if (!text || typeof text !== 'string') return 'VyOS 1.x';
    // Example: "Version: VyOS 1.5-stream-2025-Q1..."
    const match = text.match(/^Version:\s*(.+)$/m);
    if (match) return match[1].trim();
    // Fallback if just raw string is returned but contains VyOS
    if (text.includes('VyOS')) {
        const lines = text.split('\n');
        const vLine = lines.find(l => l.startsWith('Version:'));
        if (vLine) return vLine.replace('Version:', '').trim();
    }
    return 'VyOS';
};

/**
 * Helper to parse value with unit to MB
 */
const parseBytes = (str) => {
    if (!str) return 0;
    const match = str.match(/([\d\.]+)\s*([A-Za-z]+)/);
    if (!match) return parseFloat(str) || 0;

    let val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    if (unit.startsWith('G')) val *= 1024;
    else if (unit.startsWith('K')) val /= 1024;
    // Default MB
    return val;
};

/**
 * Parses 'show system memory' output
 * Format:
 * Total: 15.63 GB
 * Used: 737.12 MB
 */
export const parseMemory = (text) => {
    if (!text || typeof text !== 'string') return 'N/A';

    // Look for "Total: <val>" and "Used: <val>"
    // The previous regex was simpler, now we need to match the unit too.
    const totalMatch = text.match(/Total:\s*([\d\.]+\s*[A-Za-z]+)/i);
    const usedMatch = text.match(/Used:\s*([\d\.]+\s*[A-Za-z]+)/i);

    if (totalMatch && usedMatch) {
        const totalMb = parseBytes(totalMatch[1]);
        const usedMb = parseBytes(usedMatch[1]);

        if (totalMb > 0) {
            const pct = Math.round((usedMb / totalMb) * 100);
            return `${pct}%`;
        }
    }
    return 'N/A';
};

/**
 * Parses 'show system cpu' or 'show monitoring cpu' output
 */
export const parseCpu = (text) => {
    if (!text || typeof text !== 'string') return 'N/A';

    // Check for "Idle: X%"
    const idleMatch = text.match(/Idle:\s*([\d\.]+)%/i);
    if (idleMatch) {
        const idle = parseFloat(idleMatch[1]);
        return `${Math.round(100 - idle)}%`;
    }

    // Check for "val%" (generic)
    const utilMatch = text.match(/Utilization:\s*([\d\.]+)%/i);
    if (utilMatch) return `${Math.round(parseFloat(utilMatch[1]))}%`;

    return 'N/A';
};

/**
 * Parses 'show system storage' vertical output
 * Used: 693M (3%)
 */
export const parseStorage = (text) => {
    if (!text || typeof text !== 'string') return 'N/A';

    // Look for "Used: <val> (<pct>%)"
    const usedMatch = text.match(/Used:.*\((\d+)%\)/);
    if (usedMatch) return `${usedMatch[1]}%`;

    // Fallback to df -h table style
    const lines = text.split('\n');
    let rootLine = lines.find(l => l.trim().endsWith(' /'));
    if (rootLine) {
        const pctMatch = rootLine.match(/(\d+)%/);
        if (pctMatch) return pctMatch[0];
    }

    return 'N/A';
}

/**
 * Parses 'show system uptime'
 * Example: 22:30:10 up 3 days, 10:20,  1 user,  load average: 0.00, 0.01, 0.05
 */
export const parseUptime = (text) => {
    if (!text || typeof text !== 'string') return 'N/A';

    // Match "load average: 0.00"
    const match = text.match(/load average:\s*([\d\.]+)/);
    if (match) {
        return match[1];
    }

    return 'N/A';
};
