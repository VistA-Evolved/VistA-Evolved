'use client';

import { PatientProvider } from '@/stores/patient-context';
import { CPRSUIProvider } from '@/stores/cprs-ui-state';
import { DataCacheProvider } from '@/stores/data-cache';
import { SessionProvider } from '@/stores/session-context';
import CPRSModals from '@/components/cprs/CPRSModals';

export default function CPRSLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CPRSUIProvider>
        <PatientProvider>
          <DataCacheProvider>
            {children}
            <CPRSModals />
          </DataCacheProvider>
        </PatientProvider>
      </CPRSUIProvider>
    </SessionProvider>
  );
}
