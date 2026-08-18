import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { training, user } from '@/db/schema';
import { PasaportTrainingSelect } from '@/components/admin/pasaport-training-select';
import { ExternalUserPanel } from '@/components/admin/external-user-panel';

export default async function PasaportAyarlariPage() {
  const [trainings, externalUsers] = await Promise.all([
    db.select().from(training).orderBy(training.ad),
    db.select().from(user).where(eq(user.role, 'dis')),
  ]);

  externalUsers.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">
          Pasaportta Gösterilecek Eğitimler
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Eğitim Pasaportu panelinde dış kullanıcılara sadece burada işaretlediğiniz eğitimlerin
          durumu gösterilir.
        </p>
        <PasaportTrainingSelect
          trainings={trainings.map((t) => ({
            id: t.id,
            ad: t.ad,
            kategori: t.kategori,
            pasaportGoster: t.pasaportGoster,
          }))}
        />
      </div>
      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">
          Dış Kullanıcılar
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Buradan eklenen kullanıcılar sisteme girdiğinde sadece Eğitim Pasaportu sorgu panelini
          görür; başka hiçbir sekmeye erişemez.
        </p>
        <ExternalUserPanel
          users={externalUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            firma: u.firma,
          }))}
        />
      </div>
    </div>
  );
}
