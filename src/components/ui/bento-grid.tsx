"use client"

import type { ComponentPropsWithoutRef, ReactNode } from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
    children: ReactNode
    className?: string
}

export interface BentoCardProps extends ComponentPropsWithoutRef<"button"> {
    name: string
    className?: string
    background?: ReactNode
    icon: string
    description: string
    onClick?: () => void
    color: string
    ai?: boolean
    history?: boolean
    plus?: boolean
    arrow?: boolean
    lunaIcon?: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
    return (
        <div
            className={cn(
                "grid w-full grid-cols-2 md:grid-cols-4 gap-4",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

const BentoCard = ({
    name,
    className,
    background,
    icon,
    description,
    onClick,
    color,
    ai,
    history,
    plus,
    arrow,
    lunaIcon,
    ...props
}: BentoCardProps) => (
    <button
        key={name}
        onClick={onClick}
        className={cn(
            "group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] h-[160px] text-left active:scale-[0.98] transition-all duration-500",
            "[box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
            "transform-gpu dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] border-2",
            className
        )}
        style={{ 
            borderColor: `${color}44`,
            color: color === '#FBCB43' ? '#eab308' : color
        }}
        {...props}
    >
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">{background}</div>
        <div className="p-6 z-10 w-full h-full flex flex-col justify-between overflow-hidden">
            <div className="pointer-events-none flex transform-gpu flex-col gap-1.5 transition-all duration-500">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 shadow-sm backdrop-blur-md transition-all duration-500 group-hover:scale-50 group-hover:opacity-0 mb-3">
                    <span className="material-symbols-rounded text-[24px] transform-gpu transition-all duration-300 ease-in-out" style={{ color: color }}>{icon}</span>
                </div>
                <div className="transition-all duration-500 group-hover:-translate-y-[62px]">
                    <h3 className="text-base font-black uppercase tracking-[0.1em] leading-none mb-1 text-slate-800 dark:text-white transition-all duration-500 group-hover:text-lg">
                        {name}
                    </h3>
                    <p className="text-[11px] font-bold opacity-60 dark:opacity-40 leading-tight line-clamp-2 text-slate-600 dark:text-slate-300 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">{description}</p>
                </div>
            </div>

            <div
                className={cn(
                    "pointer-events-none absolute bottom-6 left-0 flex w-full translate-y-4 transform-gpu flex-row items-center justify-start px-6 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
                )}
            >
                <div className="text-[10px] font-black uppercase tracking-widest leading-none flex items-center gap-2 bg-black/5 dark:bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/20">
                    <span>Registrar</span>
                    <span className="material-symbols-rounded text-[14px]">arrow_forward</span>
                </div>
            </div>
        </div>

        {/* Big card badges */}
        {className?.includes("col-span-2") && (ai || arrow) && name !== 'Historial' && (
            <div className="absolute top-4 right-4 bg-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-md opacity-100 transition-opacity duration-300 group-hover:opacity-0 z-10">
                {ai ? (
                    lunaIcon ? <img src={lunaIcon} className="w-3.5 h-3.5 rounded-full object-cover" alt="Luna" /> : <span className="material-symbols-rounded text-[14px]">auto_awesome</span>
                ) : arrow ? <span className="material-symbols-rounded text-xs">arrow_forward_ios</span> : null}
                {ai ? 'Luna AI' : ''}
            </div>
        )}

        {name === 'Historial' && (
            <div className="absolute top-1/2 -translate-y-1/2 right-6 text-white opacity-100 transition-opacity duration-300 group-hover:opacity-0 z-10 flex flex-col items-center">
                <span className="material-symbols-rounded text-2xl opacity-40">arrow_forward_ios</span>
            </div>
        )}

        <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.08] group-hover:dark:bg-white/[.05] z-20" />
    </button>
)

export { BentoCard, BentoGrid }
