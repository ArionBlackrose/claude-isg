'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { updatePersonnel } from '@/actions/personnel';
import { personnelSchema, type PersonnelInput, type PersonnelOutput } from '@/schemas/personnel';
import { todayStr } from '@/lib/training-status';
import type { PersonelRow } from './personel-table';

export function PersonelEditDialog({
  personnel,
  open,
  onOpenChange,
}: {
  personnel: PersonelRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [previousCikisTarihi, setPreviousCikisTarihi] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PersonnelInput, unknown, PersonnelOutput>({
    resolver: zodResolver(personnelSchema),
    defaultValues: {
      tcNo: personnel.tcNo ?? '',
      ad: personnel.ad,
      soyad: personnel.soyad,
      gorev: personnel.gorev ?? '',
      firma: personnel.firma ?? '',
      calismaSekli: personnel.calismaSekli ?? 'Tam Zamanlı',
      dogumTarihi: personnel.dogumTarihi ?? '',
      iseGirisTarihi: personnel.iseGirisTarihi ?? '',
      durum: personnel.durum,
    },
  });

  const firmaChanged = (watch('firma') || '') !== (personnel.firma ?? '');
  const firmaChangedRef = useRef(firmaChanged);

  // Firma değiştirildiğinde İşe Giriş Tarihi'nin eski firmadan kalma
  // değerle sessizce kaydedilmesini önlemek için alan boşaltılır; kullanıcı
  // yeni firmaya giriş tarihini elle girmek zorunda kalır. Firma alanı
  // orijinal değerine geri alınırsa orijinal tarih geri yüklenir.
  useEffect(() => {
    if (firmaChanged === firmaChangedRef.current) return;
    firmaChangedRef.current = firmaChanged;
    setValue('iseGirisTarihi', firmaChanged ? '' : (personnel.iseGirisTarihi ?? ''));
  }, [firmaChanged, personnel.iseGirisTarihi, setValue]);

  async function onSubmit(values: PersonnelOutput) {
    if (firmaChanged && !values.iseGirisTarihi) {
      toast.error('Firma değişikliği yapıldığında İşe Giriş Tarihi girilmesi zorunludur.');
      return;
    }
    const result = await updatePersonnel(personnel.id, { ...values, previousCikisTarihi });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${values.ad} ${values.soyad}" güncellendi.`);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {personnel.ad} {personnel.soyad} — Düzenle
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-tcNo">TC No</Label>
              <Input
                id="edit-tcNo"
                placeholder="11 haneli"
                inputMode="numeric"
                maxLength={11}
                {...register('tcNo')}
              />
              {errors.tcNo && <p className="text-xs text-danger">{errors.tcNo.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-ad">Ad</Label>
              <Input id="edit-ad" maxLength={50} {...register('ad')} />
              {errors.ad && <p className="text-xs text-danger">{errors.ad.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-soyad">Soyad</Label>
              <Input id="edit-soyad" maxLength={50} {...register('soyad')} />
              {errors.soyad && <p className="text-xs text-danger">{errors.soyad.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-gorev">Görev</Label>
              <Input id="edit-gorev" maxLength={50} {...register('gorev')} />
              {errors.gorev && <p className="text-xs text-danger">{errors.gorev.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-firma">Firma</Label>
              <Input id="edit-firma" maxLength={100} {...register('firma')} />
              {errors.firma && <p className="text-xs text-danger">{errors.firma.message}</p>}
            </div>
            {firmaChanged && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-previousCikisTarihi">
                  Önceki Firmadan Çıkış Tarihi (opsiyonel)
                </Label>
                <Input
                  id="edit-previousCikisTarihi"
                  type="date"
                  max={todayStr()}
                  value={previousCikisTarihi}
                  onChange={(e) => setPreviousCikisTarihi(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="edit-dogumTarihi">Doğum Tarihi</Label>
              <Input
                id="edit-dogumTarihi"
                type="date"
                max={todayStr()}
                {...register('dogumTarihi')}
              />
              {errors.dogumTarihi && (
                <p className="text-xs text-danger">{errors.dogumTarihi.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-iseGirisTarihi">
                İşe Giriş Tarihi{firmaChanged && <span className="text-danger"> *</span>}
              </Label>
              <Input
                id="edit-iseGirisTarihi"
                type="date"
                max={todayStr()}
                {...register('iseGirisTarihi')}
              />
              {errors.iseGirisTarihi && (
                <p className="text-xs text-danger">{errors.iseGirisTarihi.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-calismaSekli">Çalışma Şekli</Label>
              <Select
                value={watch('calismaSekli')}
                onValueChange={(v) => setValue('calismaSekli', v ?? 'Tam Zamanlı')}
              >
                <SelectTrigger id="edit-calismaSekli" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tam Zamanlı">Tam Zamanlı</SelectItem>
                  <SelectItem value="Geçici Görev">Geçici Görev</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-durum">Durum</Label>
              <Select
                value={watch('durum')}
                onValueChange={(v) => setValue('durum', (v as 'Güncel' | 'Çıkış') ?? 'Güncel')}
              >
                <SelectTrigger id="edit-durum" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Güncel">Güncel</SelectItem>
                  <SelectItem value="Çıkış">Çıkış</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
