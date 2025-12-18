"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
    const handleRetry = () => {
        window.location.reload();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="text-center max-w-md">
                <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <WifiOff className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    You're Offline
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    It looks like you've lost your internet connection. Please check your connection and try again.
                </p>
                <Button onClick={handleRetry} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                </Button>
            </div>
        </div>
    );
}
