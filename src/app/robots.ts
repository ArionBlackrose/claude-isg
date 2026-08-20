import type { MetadataRoute } from 'next';

/** Dahili, oturum arkasında çalışan bir personel yönetim paneli — arama
 * motorlarının dizinlemesi istenmez. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
