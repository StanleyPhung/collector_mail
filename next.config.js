// next.config.js

/** @type {import("next").NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: true, // Suppresses TypeScript errors
    },
    eslint: {
        ignoreDuringBuilds: true, // Skips ESLint checks during builds
    },
};

export default nextConfig;
