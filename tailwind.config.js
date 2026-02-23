/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: "#9D85E1",
                "background-light": "#FDFCFE",
                mint: "#A8E6CF",
                peach: "#FFD3B6",
                "soft-yellow": "#FFF9C4",
                "soft-pink": "#FF8B94",
                "lavender-bubble": "#E8E4FF",
            },
            fontFamily: {
                display: ["Quicksand", "sans-serif"],
                chat: ["Manrope", "sans-serif"],
            },
            borderRadius: {
                'default': '24px',
                'xl': '32px',
            }
        },
    },
    plugins: [],
}
