import {
  NotConfiguredPanel,
  SettingsPageHeader,
  SettingsSection,
  SettingsSections,
} from "./SettingsPage";
import type { GlyphName } from "./glyphs";

/**
 * A settings surface this build does not model yet. Deliberately honest: the
 * real heading, one line of what the feature does, one panel explaining why
 * there is nothing here, and a disabled primary action. No lorem, no fake data.
 */
export function NotConfiguredPage({
  title,
  description,
  sectionTitle,
  glyph,
  panelTitle,
  body,
  action,
}: {
  title: string;
  description: string;
  sectionTitle: string;
  glyph: GlyphName;
  panelTitle: string;
  body: string;
  action: string;
}) {
  return (
    <>
      <SettingsPageHeader title={title} description={description} />
      <SettingsSections>
        <SettingsSection id="overview" title={sectionTitle}>
          <NotConfiguredPanel
            glyph={glyph}
            title={panelTitle}
            body={body}
            action={action}
          />
        </SettingsSection>
      </SettingsSections>
    </>
  );
}
