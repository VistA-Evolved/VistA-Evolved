'use client';

import { PatientProvider } from '@/stores/patient-context';
import { CPRSUIProvider } from '@/stores/cprs-ui-state';
import { DataCacheProvider } from '@/stores/data-cache';
import { SessionProvider } from '@/stores/session-context';
import CPRSModals from '@/components/cprs/CPRSModals';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DegradedBanner } from '@/components/cprs/DegradedBanner';

export default function CPRSLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary name="CPRS Application">
      <SessionProvider>
        <CPRSUIProvider>
          <PatientProvider>
            <DataCacheProvider>
              <DegradedBanner />
              <ErrorBoundary name="CPRS Content">
                {children}
              </ErrorBoundary>
              <CPRSModals />
            </DataCacheProvider>
          </PatientProvider>
        </CPRSUIProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
