import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Add this if you use a 'src' directory!
  ],
  theme: {
    extend: {
      fontFamily: {
        // This connects the 'font-display' class in the code to the Satoshi font
        display: ['Satoshi', 'system-ui', 'sans-serif'], 
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;