import {
    type ReactElement,
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from "react"
import { cn } from "../../lib/utils"

interface NeonColorsProps {
    firstColor: string
    secondColor: string
}

interface NeonGradientCardProps extends React.HTMLAttributes<HTMLDivElement> {
    as?: ReactElement
    className?: string
    children?: ReactNode
    borderSize?: number
    borderRadius?: number
    neonColors?: NeonColorsProps
    innerClassName?: string
}

export const NeonGradientCard: React.FC<NeonGradientCardProps> = ({
    className,
    children,
    borderSize = 2,
    borderRadius = 20,
    neonColors = {
        firstColor: "#9D85E1",
        secondColor: "#3994ef",
    },
    innerClassName,
    ...props
}) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { offsetWidth, offsetHeight } = containerRef.current
                setDimensions({ width: offsetWidth, height: offsetHeight })
            }
        }

        updateDimensions()
        window.addEventListener("resize", updateDimensions)

        return () => {
            window.removeEventListener("resize", updateDimensions)
        }
    }, [])

    useEffect(() => {
        if (containerRef.current) {
            const { offsetWidth, offsetHeight } = containerRef.current
            setDimensions({ width: offsetWidth, height: offsetHeight })
        }
    }, [children])

    return (
        <div
            ref={containerRef}
            style={{
                background: `linear-gradient(135deg, ${neonColors.firstColor}, ${neonColors.secondColor}, ${neonColors.firstColor})`,
                backgroundSize: '200% 200%',
                padding: `${borderSize}px`,
                borderRadius: `${borderRadius}px`,
                animation: 'background-position-spin 3000ms infinite alternate',
            }}
            className={cn(
                "relative z-10 size-full",
                className
            )}
            {...props}
        >
            {/* Blurred glow layer behind the card */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: `${borderRadius}px`,
                    background: `linear-gradient(135deg, ${neonColors.firstColor}, ${neonColors.secondColor})`,
                    filter: `blur(${dimensions.width > 0 ? dimensions.width / 6 : 20}px)`,
                    opacity: 0.5,
                    zIndex: -1,
                }}
            />
            {/* Solid white inner card */}
            <div
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: `${borderRadius - borderSize}px`,
                    position: 'relative',
                    zIndex: 0,
                }}
                className={cn("size-full min-h-[inherit] break-words", innerClassName)}
            >
                {children}
            </div>
        </div>
    )
}
