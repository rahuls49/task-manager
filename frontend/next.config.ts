import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    disable: false,
    workboxOptions: {
        disableDevLogs: true,
    },
    fallbacks: {
        document: "/~offline",
    },
});

const nextConfig: NextConfig = {
    // Add empty turbopack config to allow both webpack and turbopack builds
    turbopack: {},
};

export default withPWA(nextConfig);
