/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                vyos: {
                    dark: '#1e293b',
                    light: '#334155',
                    primary: '#3b82f6',
                }
            }
        },
    },
    plugins: [],
}
