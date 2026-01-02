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
 * Parses 'show system memory' output
 * Expected: Total: 8060, Used: 500, Free: 7560
 */
export const parseMemory = (text) => {
    if (!text || typeof text !== 'string') return 'N/A';

    // Regex for "Total: 123, Used: 456"
    const totalMatch = text.match(/Total:\s*(\d+)/i);
    const usedMatch = text.match(/Used:\s*(\d+)/i);

    if (totalMatch && usedMatch) {
        const total = parseInt(totalMatch[1], 10);
        const used = parseInt(usedMatch[1], 10);
        if (total > 0) {
            const pct = Math.round((used / total) * 100);
            return `${pct}%`;
        }
    }
    return 'N/A';
};

/**
 * Parses 'show system cpu' output
 * Tries to find loose percentages or load avg
 */
export const parseCpu = (text) => {
    if (!text || typeof text !== 'string') return 'N/A';

    // Case 1: "CPU utilization: 5%"
    const utilMatch = text.match(/CPU utilization:\s*([\d\.]+)%/i);
    if (utilMatch) return `${Math.round(parseFloat(utilMatch[1]))}%`;

    // Case 2: "User: 1.2%, System: 0.5%, Idle: 98%" (Sum non-idle?)
    // Or just look for "Idle: X%" and subtract from 100
    const idleMatch = text.match(/Idle:\s*([\d\.]+)%/i);
    if (idleMatch) {
        const idle = parseFloat(idleMatch[1]);
        return `${Math.round(100 - idle)}%`;
    }

    return 'N/A';
};

/**
 * Parses 'show system storage usage' output (df -h style)
 * Finds usage for root partition '/' or /config
 */
export const parseStorage = (text) => {
    if (!text || typeof text !== 'string') return 'N/A';

    const lines = text.split('\n');
    // Header: Filesystem Size Used Avail Use% Mounted on

    // Find line mounted on '/' or '/config' or just grab largest usage?
    // Let's grab '/' (root)
    let rootLine = lines.find(l => l.trim().endsWith(' /'));
    if (!rootLine) rootLine = lines.find(l => l.trim().endsWith('/config')); // Fallback

    if (rootLine) {
        // defined by whitespace, Use% is usually 5th column?
        // Let's just Regex for the percentage
        const pctMatch = rootLine.match(/(\d+)%/);
        if (pctMatch) return pctMatch[0];
    }

    return 'N/A';
}
