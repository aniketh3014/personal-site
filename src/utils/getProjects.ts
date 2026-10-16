import { getCollection } from "astro:content";

/** Non-draft projects, ordered by `order` ascending, then title. */
export async function getProjects() {
  const projects = await getCollection("projects", ({ data }) => !data.draft);
  return projects.sort(
    (a, b) =>
      a.data.order - b.data.order || a.data.title.localeCompare(b.data.title)
  );
}
