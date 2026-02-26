export default function Generator() { return <main style={{ padding: 24 }}><h1>Generator</h1></main>; }

import { supabaseBrowser } from "@/utils/supabase/browser";

const supabase = supabaseBrowser();

async function saveToLibrary({
  title,
  excerpt,
  contentMd,
  contentHtml,
  sources,
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const { error } = await supabase.from("blog_posts").insert({
    user_id: auth.user.id,
    title,
    excerpt,
    content_md: contentMd,
    content_html: contentHtml,
    sources,
    status: "draft",
  });

  if (error) {
    console.error(error);
  }
}
