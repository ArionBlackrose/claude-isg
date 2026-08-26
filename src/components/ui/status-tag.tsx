import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/** "Güvenlik etiketi" rozet şekli (bkz. globals.css .tag) için ton varyantları —
 * yeni bir durum eklemek burada bir satırdır, kullanım yerlerini değiştirmez. */
const statusTagVariants = cva('tag', {
  variants: {
    tone: {
      ok: 'tag-ok',
      warn: 'tag-warn',
      bad: 'tag-bad',
      none: 'tag-none',
    },
  },
  defaultVariants: {
    tone: 'none',
  },
});

function StatusTag({
  className,
  tone,
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof statusTagVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(statusTagVariants({ tone }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'status-tag',
      tone,
    },
  });
}

export { StatusTag, statusTagVariants };
