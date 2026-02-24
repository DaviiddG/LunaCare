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
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
    return (
        <div
            className={cn(
                "grid w-full grid-cols-2 gap-4",
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
    ...props
}: BentoCardProps) => (
    <button
        key={name}
        onClick={onClick}
        className={cn(
            "group relative flex flex-col justify-between overflow-hidden rounded-xl h-[120px] text-left active:scale-[0.98] transition-all",
            "[box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
            "transform-gpu dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:[border:1px_solid_rgba(255,255,255,.1)]",
            className
        )}
        style={{ backgroundColor: color, color: color === '#FBCB43' ? '#1e293b' : 'white' }}
        {...props}
    >
        <div className="absolute inset-0 z-0 pointer-events-none">{background}</div>
        <div className="p-4 z-10 w-full h-full flex flex-col justify-start">
            <div className="pointer-events-none flex transform-gpu flex-col gap-1 transition-all duration-300 group-hover:-translate-y-2">
                <div className="flex justify-between items-start mb-2">
                    <span className="material-symbols-rounded text-[28px] opacity-90 origin-left transform-gpu transition-all duration-300 ease-in-out group-hover:scale-95">{icon}</span>
                    {(!className?.includes("col-span-2") && (ai || history || plus)) && (
                        <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md opacity-100 transition-opacity duration-300 group-hover:opacity-0">
                            <span className="material-symbols-rounded text-xs">{ai ? 'auto_awesome' : (history ? 'history' : 'add')}</span>
                        </div>
                    )}
                </div>
                <h3 className="text-base font-bold leading-tight">
                    {name}
                </h3>
                <p className="max-w-lg text-xs opacity-80 line-clamp-1">{description}</p>
            </div>

            <div
                className={cn(
                    "pointer-events-none absolute bottom-3 left-4 flex w-full translate-y-10 transform-gpu flex-row items-center opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                )}
            >
                <div className="text-xs font-bold leading-none flex items-center gap-1 bg-black/10 dark:bg-white/20 px-3 py-1.5 rounded-[8px] backdrop-blur-md">
                    <span>Registrar</span>
                    <span className="material-symbols-rounded text-[14px]">arrow_forward</span>
                </div>
            </div>
        </div>

        {/* Big card badges */}
        {className?.includes("col-span-2") && (ai || arrow) && name !== 'Historial' && (
            <div className="absolute top-4 right-4 bg-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 backdrop-blur-md opacity-100 transition-opacity duration-300 group-hover:opacity-0 z-10">
                <span className="material-symbols-rounded text-xs">{ai ? 'auto_awesome' : (arrow ? 'arrow_forward_ios' : '')}</span>
                {ai ? 'Luna AI' : ''}
            </div>
        )}

        {name === 'Historial' && (
            <div className="absolute top-1/2 -translate-y-1/2 right-4 text-white opacity-100 transition-opacity duration-300 group-hover:opacity-0 z-10">
                <span className="material-symbols-rounded text-xl opacity-90">arrow_forward_ios</span>
            </div>
        )}

        <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.08] group-hover:dark:bg-white/[.05] z-20" />
    </button>
)

export { BentoCard, BentoGrid }
