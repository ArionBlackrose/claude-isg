import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE_CLASSES } from '@/lib/training-status';
import type { DetailView } from './types';

export type SummaryCard = {
  label: string;
  num: number;
  view: DetailView;
  egitimDurum?: string;
  adamSaatRange?: 'ay' | 'tumu' | 'proje';
  icon: LucideIcon;
  tone?: 'danger' | 'warning';
};

export function SummaryCards({
  cards,
  onCardClick,
}: {
  cards: SummaryCard[];
  onCardClick: (card: SummaryCard) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const tone = TONE_CLASSES[c.tone ?? 'primary'];
        return (
          <button
            key={c.label}
            type="button"
            onClick={() => onCardClick(c)}
            className={cn(
              'group relative overflow-hidden rounded-lg border border-border bg-panel p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
              tone.border,
            )}
          >
            <span className={cn('absolute inset-y-0 left-0 w-[3px]', tone.bar)} />
            <div className="flex items-start justify-between gap-2">
              <div className="font-heading text-3xl leading-none font-extrabold">{c.num}</div>
              <div
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-md',
                  tone.badge,
                )}
              >
                <Icon className="size-4" />
              </div>
            </div>
            <div className="mt-1.5 text-xs tracking-wide text-muted-foreground uppercase">
              {c.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
