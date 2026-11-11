'use client';

import React from 'react';
import KhataConsolidatedReportView from '@/components/free-khata/KhataConsolidatedReportView';

export default function FreeKhataReportsPage() {
  return (
    <KhataConsolidatedReportView
      backHref="/free-khata"
      backLabel="Back to Personal Khata"
    />
  );
}

