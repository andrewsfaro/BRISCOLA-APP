// tailwind.config.cjs
module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
      extend: {
        colors: {
          background: "#0B6623",
          primary: "#D32F2F",
          "primary-dark": "#B71C1C",
          secondary: "#1976D2",
        },
        fontFamily: {
          sans: ["Poppins", "sans-serif"],
        },
      },
    },
    plugins: [],
  };
  