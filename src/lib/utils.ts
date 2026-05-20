import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function babyAvatarUrl(name: string, gender?: string): string {
    const seed = name.trim() || 'Bebé';
    const g = (gender || '').toLowerCase().trim();
    const isMale = ['niño', 'nino', 'masculino', 'male', 'boy', 'm'].includes(g);
    const top = isMale
        ? 'shortFlat,shortRound,shortWaved,sides,theCaesar,theCaesarAndSidePart,shavedSides,shortCurly'
        : 'bob,bun,curly,curvy,dreads,frida,fro,froBand,longButNotTooLong,miaWallace,straight02,straight01,straightAndStrand,bigHair';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&top=${top}`;
}

export function getBabyAvatarUrl(avatarUrl: string | null | undefined, name: string, gender?: string): string {
    const fallback = babyAvatarUrl(name, gender);
    if (!avatarUrl) return fallback;
    const cleanUrl = avatarUrl.trim();
    if (cleanUrl === '' || cleanUrl === 'null' || cleanUrl === 'undefined') return fallback;
    // If it's a broken supabase storage URL without a filename
    if (cleanUrl.includes('/storage/v1/object/public/avatars/') && (cleanUrl.endsWith('/') || cleanUrl.split('/').pop() === '')) {
        return fallback;
    }
    return cleanUrl;
}

