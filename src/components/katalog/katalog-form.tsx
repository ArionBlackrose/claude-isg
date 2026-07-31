'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTraining } from '@/actions/training';
import { trainingSchema, type TrainingInput } from '@/schemas/training';

export function KatalogForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrainingInput>({
    resolver: zodResolver(trainingSchema),
    defaultValues: { ad: '', kategori: 'Genel', gecerlilikAy: 0 },
  });

  async function onSubmit(values: TrainingInput) {
    const result = await createTraining(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${values.ad}" eğitim türü eklendi.`);
    reset({ ad: '', kategori: 'Genel', gecerlilikAy: 0 });
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-1 gap-3.5 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
    >
      <div className="space-y-1.5">
        <Label htmlFor="ad">Eğitim Adı</Label>
        <Input id="ad" {...register('ad')} />
        {errors.ad && <p className="text-xs text-danger">{errors.ad.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="kategori">Kategori</Label>
        <Input id="kategori" placeholder="Genel / Özel / Uyarı" {...register('kategori')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="gecerlilikAy">Geçerlilik (ay)</Label>
        <Input
          id="gecerlilikAy"
          type="number"
          min={0}
          placeholder="0 = süresiz"
          {...register('gecerlilikAy', { valueAsNumber: true })}
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Ekleniyor...' : 'Eğitimi Ekle'}
      </Button>
    </form>
  );
}
