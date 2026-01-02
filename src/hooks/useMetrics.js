import { useState, useEffect, useRef } from 'react';

/**
 * Hook to calculate traffic rates (Bps) from counter snapshots.
 * @param {Object} countersObj - { eth0: { rx: bytes, tx: bytes }, ... }
 * @returns {Object} { eth0: { rxBps: number, txBps: number }, ... }
 */
export const useTrafficRate = (countersObj) => {
    const [rates, setRates] = useState({});
    const prevCountersRef = useRef({});
    const lastTimeRef = useRef(Date.now());

    useEffect(() => {
        if (!countersObj || Object.keys(countersObj).length === 0) return;

        const now = Date.now();
        const deltaSeconds = (now - lastTimeRef.current) / 1000;

        // Ignore valid updates that are suspiciously fast (< 0.5s) to avoid div/0 spikes
        // But for identical data (no change), we DO want to process (rate = 0)
        // Actually, if countersObj changes, it's a new snapshot. 
        if (deltaSeconds < 0.1) return;

        const newRates = {};

        Object.keys(countersObj).forEach(iface => {
            const curr = countersObj[iface];
            const prev = prevCountersRef.current[iface];

            if (prev) {
                const deltaRx = curr.rx - prev.rx;
                const deltaTx = curr.tx - prev.tx;

                // Rates in Bytes Per Second
                const rxBps = deltaRx > 0 ? deltaRx / deltaSeconds : 0;
                const txBps = deltaTx > 0 ? deltaTx / deltaSeconds : 0;

                newRates[iface] = { rxBps, txBps };
            } else {
                // First data point, rate is 0 because we have no delta
                newRates[iface] = { rxBps: 0, txBps: 0 };
            }
        });

        prevCountersRef.current = countersObj;
        lastTimeRef.current = now;
        setRates(newRates);

    }, [countersObj]);

    return rates;
};

/**
 * Hook to maintain a timeseries history array for recharts.
 * @param {any} value - Current value to create a point for.
 * @param {number} maxPoints - Maximum history length.
 * @returns {Array} Array of data points.
 */
export const useHistory = (value, maxPoints = 20) => {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        // Only add points if value is valid number/object
        if (value === undefined || value === null || value === 'N/A') return;

        setHistory(prev => {
            const now = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

            let point;
            if (typeof value === 'object') {
                point = { time: now, ...value };
            } else {
                point = { time: now, value: value };
            }

            const newHistory = [...prev, point];
            if (newHistory.length > maxPoints) {
                return newHistory.slice(newHistory.length - maxPoints);
            }
            return newHistory;
        });
    }, [value, maxPoints]);

    return history;
};
