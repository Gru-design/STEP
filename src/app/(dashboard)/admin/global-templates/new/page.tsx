import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewGlobalTemplateForm } from "./NewGlobalTemplateForm";

export default async function NewGlobalTemplatePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (dbUser?.role !== "super_admin") {
    redirect("/");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">
        グローバルテンプレート作成
      </h1>
      <NewGlobalTemplateForm />
    </div>
  );
}
