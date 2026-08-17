import { getProjectSettings } from '@/actions/project';
import { ProjeForm } from '@/components/admin/proje-form';

export default async function ProjeBilgileriPage() {
  const settings = await getProjectSettings();

  return (
    <div className="rounded-lg border border-border bg-panel p-5">
      <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">
        Proje Bilgileri
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Proje adı, açıklaması ve başlangıç tarihi — Rapor sayfasındaki &quot;Proje Başından Beri
        Adam-Saat&quot; hesabı bu başlangıç tarihine göre yapılır. Bu bilgiler yalnızca buradan
        değiştirilebilir.
      </p>
      <ProjeForm settings={settings} />
    </div>
  );
}
