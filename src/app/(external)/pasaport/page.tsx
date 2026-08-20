import type { Metadata } from 'next';
import { PasaportSearch } from '@/components/pasaport/pasaport-search';

export const metadata: Metadata = { title: 'Eğitim Pasaportu' };

export default function PasaportPage() {
  return <PasaportSearch />;
}
