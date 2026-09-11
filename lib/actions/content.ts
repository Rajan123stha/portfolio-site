"use server";

import {
  contactLinks,
  coreStackItems,
  experiences,
  highlightGroups,
  highlights,
  navItems,
  skillGroups,
  services,
  skills,
  socialLinks,
} from "@/db/schema";
import {
  contactLinkSchema,
  coreStackItemSchema,
  experienceSchema,
  highlightGroupSchema,
  highlightSchema,
  navItemSchema,
  skillGroupSchema,
  serviceSchema,
  skillSchema,
  socialLinkSchema,
} from "@/lib/validators/content";
import { createCrudActions } from "./crud";
import type { ActionResult } from "./result";

/**
 * Content collections that share the standard create / update / delete /
 * reorder lifecycle.
 *
 * Each group below is one `createCrudActions` call plus named wrappers. The
 * wrappers exist because a `"use server"` module may only export async
 * functions — and they double as the public API, so a caller imports
 * `updateExperience` rather than reaching into a shared object.
 */

// ── About: core stack ────────────────────────────────────────────────────────

const coreStack = createCrudActions({
  table: coreStackItems,
  schema: coreStackItemSchema,
  noun: "item",
});

export async function createCoreStackItem(input: unknown) {
  return coreStack.create(input);
}
export async function updateCoreStackItem(id: string, input: unknown) {
  return coreStack.update(id, input);
}
export async function deleteCoreStackItem(id: string): Promise<ActionResult> {
  return coreStack.remove(id);
}
export async function reorderCoreStackItems(input: unknown) {
  return coreStack.reorder(input);
}

// ── Skills ───────────────────────────────────────────────────────────────────

const groups = createCrudActions({
  table: skillGroups,
  schema: skillGroupSchema,
  noun: "group",
});

export async function createSkillGroup(input: unknown) {
  return groups.create(input);
}
export async function updateSkillGroup(id: string, input: unknown) {
  return groups.update(id, input);
}
export async function deleteSkillGroup(id: string): Promise<ActionResult> {
  return groups.remove(id);
}
export async function reorderSkillGroups(input: unknown) {
  return groups.reorder(input);
}
export async function setSkillGroupVisible(id: string, visible: boolean) {
  return groups.setVisible(id, visible);
}

const skill = createCrudActions({
  table: skills,
  schema: skillSchema,
  noun: "skill",
});

export async function createSkill(input: unknown) {
  return skill.create(input);
}
export async function updateSkill(id: string, input: unknown) {
  return skill.update(id, input);
}
export async function deleteSkill(id: string): Promise<ActionResult> {
  return skill.remove(id);
}
export async function reorderSkills(input: unknown) {
  return skill.reorder(input);
}

// ── Services ─────────────────────────────────────────────────────────────────

const service = createCrudActions({
  table: services,
  schema: serviceSchema,
  noun: "service",
});

export async function createService(input: unknown) {
  return service.create(input);
}
export async function updateService(id: string, input: unknown) {
  return service.update(id, input);
}
export async function deleteService(id: string): Promise<ActionResult> {
  return service.remove(id);
}
export async function reorderServices(input: unknown) {
  return service.reorder(input);
}
export async function setServiceVisible(id: string, visible: boolean) {
  return service.setVisible(id, visible);
}

// ── Experience ───────────────────────────────────────────────────────────────

const experience = createCrudActions({
  table: experiences,
  schema: experienceSchema,
  noun: "role",
});

export async function createExperience(input: unknown) {
  return experience.create(input);
}
export async function updateExperience(id: string, input: unknown) {
  return experience.update(id, input);
}
export async function deleteExperience(id: string): Promise<ActionResult> {
  return experience.remove(id);
}
export async function reorderExperiences(input: unknown) {
  return experience.reorder(input);
}
export async function setExperienceVisible(id: string, visible: boolean) {
  return experience.setVisible(id, visible);
}

// ── Highlights ───────────────────────────────────────────────────────────────

const highlightGroup = createCrudActions({
  table: highlightGroups,
  schema: highlightGroupSchema,
  noun: "card",
  uniqueField: "slug",
  uniqueMessage: "That slug is already taken.",
});

export async function createHighlightGroup(input: unknown) {
  return highlightGroup.create(input);
}
export async function updateHighlightGroup(id: string, input: unknown) {
  return highlightGroup.update(id, input);
}
export async function deleteHighlightGroup(id: string): Promise<ActionResult> {
  return highlightGroup.remove(id);
}
export async function reorderHighlightGroups(input: unknown) {
  return highlightGroup.reorder(input);
}

const highlight = createCrudActions({
  table: highlights,
  schema: highlightSchema,
  noun: "point",
});

export async function createHighlight(input: unknown) {
  return highlight.create(input);
}
export async function updateHighlight(id: string, input: unknown) {
  return highlight.update(id, input);
}
export async function deleteHighlight(id: string): Promise<ActionResult> {
  return highlight.remove(id);
}
export async function reorderHighlights(input: unknown) {
  return highlight.reorder(input);
}

// ── Links ────────────────────────────────────────────────────────────────────

const contactLink = createCrudActions({
  table: contactLinks,
  schema: contactLinkSchema,
  noun: "contact link",
});

export async function createContactLink(input: unknown) {
  return contactLink.create(input);
}
export async function updateContactLink(id: string, input: unknown) {
  return contactLink.update(id, input);
}
export async function deleteContactLink(id: string): Promise<ActionResult> {
  return contactLink.remove(id);
}
export async function reorderContactLinks(input: unknown) {
  return contactLink.reorder(input);
}

const socialLink = createCrudActions({
  table: socialLinks,
  schema: socialLinkSchema,
  noun: "social link",
});

export async function createSocialLink(input: unknown) {
  return socialLink.create(input);
}
export async function updateSocialLink(id: string, input: unknown) {
  return socialLink.update(id, input);
}
export async function deleteSocialLink(id: string): Promise<ActionResult> {
  return socialLink.remove(id);
}
export async function reorderSocialLinks(input: unknown) {
  return socialLink.reorder(input);
}

const navItem = createCrudActions({
  table: navItems,
  schema: navItemSchema,
  noun: "menu item",
});

export async function createNavItem(input: unknown) {
  return navItem.create(input);
}
export async function updateNavItem(id: string, input: unknown) {
  return navItem.update(id, input);
}
export async function deleteNavItem(id: string): Promise<ActionResult> {
  return navItem.remove(id);
}
export async function reorderNavItems(input: unknown) {
  return navItem.reorder(input);
}
