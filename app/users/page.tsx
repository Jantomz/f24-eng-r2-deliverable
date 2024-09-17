import { Separator } from "@/components/ui/separator";
import { TypographyH2 } from "@/components/ui/typography";
import { createServerSupabaseClient } from "@/lib/server-utils";
import { redirect } from "next/navigation";

export default async function UsersList() {
  // Create supabase server component client and obtain user session from stored cookie
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // this is a protected route - only users who are signed in can view this route
    redirect("/");
  }

  const { data: users } = await supabase.from("profiles").select("*").order("id", { ascending: false });

  // Render the UsersList component
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <TypographyH2>Users List</TypographyH2>
      </div>
      <Separator className="my-4" />
      <div className="flex flex-wrap justify-center">
        {users?.map((user) => (
          // Display user information in cards, can be done in separate component, though for now this is simpler
          <div key={user.id} className="m-4 w-80 rounded-lg border border-gray-200 bg-white p-6 shadow-md">
            <div className="flex flex-col items-center">
              <span className="mb-2 text-xl font-bold text-black">{user.display_name}</span>
              <span className="text-sm text-gray-500">{user.email}</span>
              <span className="text-sm text-gray-500">{user.biography}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
