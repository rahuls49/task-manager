"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import StoreProvider from "@/app/StoreProvider";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <StoreProvider>
        {children}
      </StoreProvider>
    </SessionProvider>
  );
}