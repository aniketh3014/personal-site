import type { APIRoute } from "astro";
import { getProjects } from "@/utils/getProjects";
import { renderOgCard } from "@/utils/renderOgCard";

export async function getStaticPaths() {
  const projects = await getProjects();
  return projects.map(project => ({
    params: { slug: project.id },
    props: project,
  }));
}

export const GET: APIRoute = async ({ props, url }) =>
  renderOgCard(
    {
      eyebrow: "Project",
      title: props.data.title,
      footer: props.data.stack.slice(0, 4).join(" · "),
    },
    url
  );
