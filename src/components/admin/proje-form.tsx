'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateProjectSettings, type ProjectSettings } from '@/actions/project';
import { projectSettingsSchema, type ProjectSettingsInput } from '@/schemas/project';
import { todayStr } from '@/lib/training-status';

export function ProjeForm({ settings }: { settings: ProjectSettings }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectSettingsInput>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: {
      projeAdi: settings.projeAdi ?? '',
      aciklama: settings.aciklama ?? '',
      baslangicTarihi: settings.baslangicTarihi ?? '',
    },
  });

  async function onSubmit(values: ProjectSettingsInput) {
    const result = await updateProjectSettings(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Proje bilgileri güncellendi.');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-3.5">
      <div className="space-y-1.5">
        <Label htmlFor="projeAdi">Proje Adı</Label>
        <Input id="projeAdi" {...register('projeAdi')} />
        {errors.projeAdi && <p className="text-xs text-danger">{errors.projeAdi.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="aciklama">Açıklama</Label>
        <Textarea id="aciklama" rows={4} {...register('aciklama')} />
        {errors.aciklama && <p className="text-xs text-danger">{errors.aciklama.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="baslangicTarihi">Proje Başlangıç Tarihi</Label>
        <Input id="baslangicTarihi" type="date" max={todayStr()} {...register('baslangicTarihi')} />
        {errors.baslangicTarihi && (
          <p className="text-xs text-danger">{errors.baslangicTarihi.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Rapor sayfasındaki &quot;Proje Başından Beri Adam-Saat&quot; hesabı bu tarihten itibaren
          yapılır.
        </p>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
      </Button>
    </form>
  );
}
