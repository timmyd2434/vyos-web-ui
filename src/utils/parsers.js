export const parseShowInterfaces = (text) => {
    if (!text || typeof text !== 'string') return [];

    const lines = text.split('\n');
    const interfaces = [];

    // Skip header lines (usually start with "Interface" or "-------")
    // Regex matches typical VyOS "show interfaces" output:
    // Interface        IP Address                        S/L  Description
    // ---------        ----------                        ---  -----------
    // eth0             192.168.1.15/24                   u/u  WAN

    // Pattern: 
    // Group 1: Interface Name (non-whitespace)
    // Group 2: IP Address (non-whitespace, or "-" if usually none, but normally IP or -)
    // Group 3: Status/Link (e.g. u/u, u/D, A/D) (non-whitespace)
    // Group 4: Description (optional, trailing text)

    const lineRegex = /^([a-zA-Z0-9\.\-\@]+)\s+([0-9\.\:\/,\-]+)\s+([a-zA-Z\/]+)(?:\s+(.*))?$/;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('Interface') || trimmed.startsWith('-----')) return;
        if (trimmed.includes('IP Address')) return;

        const match = trimmed.match(lineRegex);
        if (match) {
            interfaces.push({
                name: match[1],
                address: match[2] === '-' ? [] : match[2].split(','), // sometimes multiple IPs comma separated? usually separate lines or shortened. text output usually 1 ip or comma.
                statusLine: match[3],
                // u/u = Admin Up / Link Up. u/D = Admin Up / Link Down
                state: match[3].toLowerCase().startsWith('u') ? 'up' : 'down',
                link: match[3].toLowerCase().endsWith('u') ? 'up' : 'down',
                description: match[4] || ''
            });
        }
    });

    return interfaces;
};
