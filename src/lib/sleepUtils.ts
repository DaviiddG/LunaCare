import { addMinutes, differenceInMonths } from 'date-fns';

/**
 * Wake Window Data (Typical ranges in minutes based on Huckleberry/Pediatric standards)
 * Age: [MinWakeWindow, MaxWakeWindow]
 */
const WAKE_WINDOWS: Record<string, [number, number]> = {
    '0-1m': [45, 60],
    '1-2m': [60, 90],
    '2-3m': [90, 105],
    '3-4m': [105, 120],
    '4-6m': [120, 150],
    '6-8m': [150, 180],
    '8-10m': [180, 210],
    '10-14m': [180, 240], // Can vary significantly
    '14m+': [300, 360],    // Typically 1 nap or transitioning
};

function getWakeWindowKey(birthDate: string): string {
    const ageMonths = differenceInMonths(new Date(), new Date(birthDate));
    if (ageMonths < 1) return '0-1m';
    if (ageMonths < 2) return '1-2m';
    if (ageMonths < 3) return '2-3m';
    if (ageMonths < 4) return '3-4m';
    if (ageMonths < 6) return '4-6m';
    if (ageMonths < 8) return '6-8m';
    if (ageMonths < 10) return '8-10m';
    if (ageMonths < 14) return '10-14m';
    return '14m+';
}

export function calculateSweetSpot(birthDate: string, lastWakeTime: string | null) {
    if (!lastWakeTime) return null;

    const key = getWakeWindowKey(birthDate);
    const window = WAKE_WINDOWS[key];

    // Average point of the wake window
    const avgWakeTime = (window[0] + window[1]) / 2;

    const wakeTimeDate = new Date(lastWakeTime);
    const sweetSpotTime = addMinutes(wakeTimeDate, avgWakeTime);

    return {
        time: sweetSpotTime,
        range: window,
        message: `Próxima ventana de sueño sugerida para esta edad (${key}): ${window[0]}-${window[1]} min.`
    };
}
