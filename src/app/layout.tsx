import type { Metadata, Viewport } from 'next';
import { Inter, Barlow_Condensed, JetBrains_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { ThemeColorSync } from '@/components/layout/theme-color-sync';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const barlowCondensed = Barlow_Condensed({
  variable: '--font-barlow-condensed',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['500', '600'],
});

export const metadata: Metadata = {
  title: {
    default: 'İSG-Ç Eğitim Takip Sistemi',
    template: '%s · İSG-Ç ETS',
  },
  description: 'Personel, Eğitim Kataloğu ve Kayıt takibi için İSG eğitim yönetim sistemi.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Medya sorgusuna göre iki ayrı meta etiketi yerine tek, medya sorgusuz bir
  // başlangıç değeri: next-themes `defaultTheme="dark"` kullandığından ve
  // gerçek kaynak ThemeColorSync ile kullanıcının seçtiği temaya göre
  // istemci tarafında güncellendiğinden (bkz. theme-color-sync.tsx), burada
  // OS tercihine göre ayrı girdiler tutmak yalnızca senkronizasyonu bozar.
  themeColor: '#14181c',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" themes={['dark', 'light']}>
          <ThemeColorSync />
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
