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
import { createPersonnel } from '@/actions/personnel';
import { personnelSchema, type PersonnelInput } from '@/schemas/personnel';

const DEFAULTS: PersonnelInput = {
  tcNo: '',
  ad: '',
  soyad: '',
  gorev: '',
  firma: '',
  calismaSekli: 'Tam Zamanlı',
  dogumTarihi: '',
  iseGirisTarihi: '',
};

export function PersonelForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PersonnelInput>({
    resolver: zodResolver(personnelSchema),
    defaultValues: DEFAULTS,
  });

  async function onSubmit(values: PersonnelInput) {
    const result = await createPersonnel(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${values.ad} ${values.soyad}" eklendi.`);
    reset(DEFAULTS);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="tcNo">TC No</Label>
          <Input id="tcNo" placeholder="11 haneli" {...register('tcNo')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ad">Ad</Label>
          <Input id="ad" {...register('ad')} />
          {errors.ad && <p className="text-xs text-danger">{errors.ad.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="soyad">Soyad</Label>
          <Input id="soyad" {...register('soyad')} />
          {errors.soyad && <p className="text-xs text-danger">{errors.soyad.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gorev">Görev</Label>
          <Input id="gorev" {...register('gorev')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="firma">Firma</Label>
          <Input id="firma" {...register('firma')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dogumTarihi">Doğum Tarihi</Label>
          <Input id="dogumTarihi" type="date" {...register('dogumTarihi')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="iseGirisTarihi">İşe Giriş Tarihi</Label>
          <Input id="iseGirisTarihi" type="date" {...register('iseGirisTarihi')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="calismaSekli">Çalışma Şekli</Label>
          <Select
            value={watch('calismaSekli')}
            onValueChange={(v) => setValue('calismaSekli', v ?? 'Tam Zamanlı')}
          >
            <SelectTrigger id="calismaSekli" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tam Zamanlı">Tam Zamanlı</SelectItem>
              <SelectItem value="Geçici Görev">Geçici Görev</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Kaydediliyor...' : 'Personeli Kaydet'}
      </Button>
    </form>
  );
}
