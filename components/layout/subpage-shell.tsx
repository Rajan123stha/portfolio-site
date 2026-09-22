import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { PortfolioData, SiteSettingsView } from "@/lib/queries/public";

/**
 * Header and footer for pages other than the homepage.
 *
 * Menu items are in-page anchors (`#about`), which only work on the homepage.
 * On any other page they're rewritten to `/#about`, so the menu still leads
 * back to the right section instead of doing nothing.
 */
export function SubpageShell({
  data,
  settings,
  children,
}: {
  data: PortfolioData;
  settings: SiteSettingsView;
  children: React.ReactNode;
}) {
  const navItems = data.navItems.map((item) =>
    item.href.startsWith("#") ? { ...item, href: `/${item.href}` } : item,
  );

  return (
    <>
      <SiteHeader
        settings={settings}
        navItems={navItems}
        socialLinks={data.socialLinks}
        contactLinks={data.contactLinks}
        cvUrl={data.profile.cvUrl}
      />
      <main>{children}</main>
      <SiteFooter
        settings={settings}
        navItems={navItems}
        socialLinks={data.socialLinks}
        year={new Date().getFullYear()}
      />
    </>
  );
}
