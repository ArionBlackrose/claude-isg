import { z } from 'zod';

/** Saha Eğitimi Ekle panelinin gönderdiği veri: bir eğitim türü, o türe ait
 * kataloglu bir başlık (topicId) YA DA (sadece training.digerSecenegiVar
 * true ise) serbest metin bir konu (manualTopic) — ikisinden tam olarak
 * biri dolu olmalı. Sonuç/Dosya No/Not alanları bu panelde yok: kayıtlar
 * her zaman "Başarılı" sayılır, konu metni trainingRecord.not alanına
 * yazılır (bkz. src/actions/saha-egitimi.ts). */
export const sahaEgitimiRecordSchema = z
  .object({
    trainingId: z.string().trim().min(1, 'Eğitim türü seçimi zorunlu.'),
    topicId: z.string().trim().optional(),
    manualTopic: z.string().trim().optional(),
    tarih: z.string().trim().min(1, 'Tarih zorunlu.'),
    personnelIds: z.array(z.string().trim().min(1)).min(1, 'En az bir personel seçin.'),
  })
  .superRefine((data, ctx) => {
    if (!data.topicId && !data.manualTopic?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Bir başlık seçin veya "Diğer" için konu yazın.',
        path: ['topicId'],
      });
    }
  });

export type SahaEgitimiRecordInput = z.infer<typeof sahaEgitimiRecordSchema>;
