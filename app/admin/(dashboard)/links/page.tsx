import { PageHeader, Panel } from "@/components/admin/page-header";
import {
  getContactLinks,
  getNavItems,
  getSocialLinks,
} from "@/lib/queries/admin";
import { ContactLinkEditor, NavItemEditor, SocialLinkEditor } from "./link-editors";

export const metadata = { title: "Navigation & links" };

export default async function LinksPage() {
  const [navItems, socialLinks, contactLinks] = await Promise.all([
    getNavItems(),
    getSocialLinks(),
    getContactLinks(),
  ]);

  return (
    <>
      <PageHeader
        title="Navigation & links"
        description="The menu, your social profiles, and the direct contact methods listed beside the enquiry form."
      />

      <div className="space-y-6">
        <Panel
          title="Menu"
          description="In-page anchors such as #projects, or full URLs. Each can appear in the header, the footer, or both."
        >
          <NavItemEditor items={navItems} />
        </Panel>

        <Panel
          title="Social profiles"
          description="Icon links in the header and footer."
        >
          <SocialLinkEditor links={socialLinks} />
        </Panel>

        <Panel
          title="Contact methods"
          description="The cards beside the contact form. The display text is what visitors see; the link is where it goes."
        >
          <ContactLinkEditor links={contactLinks} />
        </Panel>
      </div>
    </>
  );
}
