"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import StoreProvider from "@/app/StoreProvider";
import { RBACProvider } from "@/lib/rbac";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <RBACProvider>
        <StoreProvider>
          {children}
        </StoreProvider>
      </RBACProvider>
    </SessionProvider>
  );
}