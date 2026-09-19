import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Placeholders — resample once logo.png is supplied.
        brand: {
          red: "#D62828",
          "red-dark": "#A81F1F",
          blue: "#1D3F72",
          "blue-dark": "#142B4E",
        },
      },
      fontFamily: {
        heading: ["var(--font-oswald)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
