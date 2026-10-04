import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SiteProviders } from "@/components/providers/SiteProviders";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <SiteProviders>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </SiteProviders>
  );
}
