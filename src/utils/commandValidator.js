/**
 * Command Validator
 * Validates VyOS commands before staging to prevent errors
 */

/**
 * Validates a VyOS command structure
 * @param {Object} cmd - Command object with { op, path }
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateCommand = (cmd) => {
    const errors = [];

    // Check command structure exists
    if (!cmd || typeof cmd !== 'object') {
        errors.push('Command must be an object');
        return { valid: false, errors };
    }

    // Check operation exists and is valid
    if (!cmd.op) {
        errors.push('Command must have an "op" field');
    } else if (!['set', 'delete'].includes(cmd.op)) {
        errors.push(`Invalid operation: "${cmd.op}". Must be "set" or "delete"`);
    }

    // Check path exists and is an array
    if (!cmd.path) {
        errors.push('Command must have a "path" field');
    } else if (!Array.isArray(cmd.path)) {
        errors.push('Command path must be an array');
    } else if (cmd.path.length === 0) {
        errors.push('Command path cannot be empty');
    } else {
        // Validate path segments
        cmd.path.forEach((segment, index) => {
            if (typeof segment !== 'string') {
                errors.push(`Path segment at index ${index} must be a string, got ${typeof segment}`);
            } else if (segment.trim() === '') {
                errors.push(`Path segment at index ${index} cannot be empty`);
            } else if (segment.includes(' ') && !segment.match(/^["'].*["']$/)) {
                errors.push(`Path segment "${segment}" contains spaces and must be quoted`);
            }
        });
    }

    // Check for dangerous delete operations
    if (cmd.op === 'delete' && cmd.path && cmd.path.length <= 2) {
        errors.push('Cannot delete top-level configuration (path too short). This is a safety check.');
    }

    // Warn about potentially dangerous operations
    if (cmd.op === 'delete' && cmd.path && cmd.path[0] === 'system') {
        errors.push('Deleting system configuration can be dangerous. Please review carefully.');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Validates an array of commands
 * @param {Array} commands - Array of command objects
 * @returns {Object} { valid: boolean, errors: Object[] }
 */
export const validateCommands = (commands) => {
    if (!Array.isArray(commands)) {
        return {
            valid: false,
            errors: [{ index: -1, errors: ['Commands must be an array'] }]
        };
    }

    const results = commands.map((cmd, index) => {
        const validation = validateCommand(cmd);
        return {
            index,
            command: cmd,
            ...validation
        };
    });

    const allValid = results.every(r => r.valid);
    const errorResults = results.filter(r => !r.valid);

    return {
        valid: allValid,
        errors: errorResults
    };
};

/**
 * Validates specific VyOS command patterns
 * @param {Object} cmd - Command object
 * @param {Object} context - Additional context for validation
 * @returns {Object} { valid: boolean, warnings: string[] }
 */
export const validateCommandPattern = (cmd, context = {}) => {
    const warnings = [];

    if (!cmd.path || cmd.path.length === 0) {
        return { valid: true, warnings };
    }

    // Firewall rule validation
    if (cmd.path[0] === 'firewall' && cmd.path.includes('port')) {
        // Check if protocol is set when port is specified
        const hasProtocol = context.protocol ||
            (cmd.path.includes('protocol') && cmd.path.includes('tcp')) ||
            (cmd.path.includes('protocol') && cmd.path.includes('udp'));

        if (!hasProtocol) {
            warnings.push('Port configuration requires protocol to be set to TCP or UDP');
        }
    }

    // DNS forwarding validation
    if (cmd.path[0] === 'service' && cmd.path[1] === 'dns' && cmd.path[2] === 'forwarding') {
        if (cmd.path.includes('listen-address') && !context.hasAllowFrom) {
            warnings.push('DNS forwarding requires both listen-address and allow-from to be configured');
        }
    }

    // Interface validation
    if (cmd.path[0] === 'interfaces' && cmd.op === 'delete' && cmd.path.length === 3) {
        warnings.push('Deleting an interface may disrupt connectivity. Ensure you have alternative access.');
    }

    return {
        valid: true,
        warnings
    };
};
