export const parseShowInterfaces = (text) => {
    if (!text || typeof text !== 'string') return [];

    const lines = text.split('\n');
    const interfaces = [];

    // Header often contains: Codes: S - State, L - Link, u - Up, D - Down...
    // Table Header: Interface  IP Address  MAC  VRF  MTU  S/L  Description

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Skip headers / legends
        if (trimmed.startsWith('Codes:') || trimmed.startsWith('Interface') || trimmed.startsWith('-----') || trimmed.startsWith('default')) return;

        // Strategy: Identifying the "S/L" column is key. It usually looks like u/u, u/D, A/D.
        // Regex to find the S/L column: \s([uAD]\/[uAD])\s
        // This splits the line into "Left Part" (Name + IP + Stuff) and "Right Part" (Description)

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
