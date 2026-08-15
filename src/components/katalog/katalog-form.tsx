'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTraining } from '@/actions/training';
import { trainingSchema, TRAINING_CATEGORIES, type TrainingInput } from '@/schemas/training';

const DEFAULTS: TrainingInput = { ad: '', kategori: 'Genel', gecerlilikAy: 0, egitimSuresi: 0 };

export function KatalogForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TrainingInput>({
    resolver: zodResolver(trainingSchema),
    defaultValues: DEFAULTS,
  });

  async function onSubmit(values: TrainingInput) {
    const result = await createTraining(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${values.ad}" eğitim türü eklendi.`);
    reset(DEFAULTS);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
    >
      <div className="space-y-1.5">
        <Label htmlFor="ad">Eğitim Adı</Label>
        <Input id="ad" {...register('ad')} />
        {errors.ad && <p className="text-xs text-danger">{errors.ad.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="kategori">Kategori</Label>
        <Select
          value={watch('kategori')}
          onValueChange={(v) => setValue('kategori', (v as TrainingInput['kategori']) ?? 'Genel')}
        >
          <SelectTrigger id="kategori" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRAINING_CATEGORIES.map((kategori) => (
              <SelectItem key={kategori} value={kategori}>
                {kategori}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      <div className="space-y-1.5">
        <Label htmlFor="egitimSuresi">Eğitim Süresi (saat)</Label>
        <Input
          id="egitimSuresi"
          type="number"
          min={0}
          placeholder="0 = belirtilmedi"
          {...register('egitimSuresi', { valueAsNumber: true })}
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Ekleniyor...' : 'Eğitimi Ekle'}
      </Button>
    </form>
  );
}
