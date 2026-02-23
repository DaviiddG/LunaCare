import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"

// Ensure standard flushSync import (React 18+)
import { flushSync } from "react-dom"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
    duration?: number
}

export const AnimatedThemeToggler = ({
    className,
    duration = 400,
    ...props
}: AnimatedThemeTogglerProps) => {
    const [isDark, setIsDark] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        const updateTheme = () => {
            setIsDark(document.documentElement.classList.contains("dark"))
        }

        updateTheme()

        const observer = new MutationObserver(updateTheme)
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        })

        return () => observer.disconnect()
    }, [])

    const toggleTheme = useCallback(async () => {
        if (!buttonRef.current) return

        await document.startViewTransition(() => {
            flushSync(() => {
                const newTheme = !isDark
                setIsDark(newTheme)

                if (newTheme) {
                    document.documentElement.classList.add("dark")
                    localStorage.setItem("theme", "dark")
                } else {
                    document.documentElement.classList.remove("dark")
                    localStorage.setItem("theme", "light")
                }
            })
        }).ready;

        const { top, left, width, height } =
            buttonRef.current.getBoundingClientRect()
        const x = left + width / 2
        const y = top + height / 2
        const maxRadius = Math.hypot(
            Math.max(left, window.innerWidth - left),
            Math.max(top, window.innerHeight - top)
        )

        document.documentElement.animate(
            {
                clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${maxRadius}px at ${x}px ${y}px)`,
                ],
            },
            {
                duration,
                easing: "ease-in-out",
                pseudoElement: "::view-transition-new(root)",
            }
        )
    }, [isDark, duration])

    return (
        <button
            ref={buttonRef}
            onClick={toggleTheme}
            className={`relative inline-flex items-center justify-center p-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${className || ''}`}
            {...props}
        >
            {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            <span className="sr-only">Toggle theme</span>
        </button>
    )
}
