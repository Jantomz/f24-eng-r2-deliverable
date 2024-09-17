"use client";

// Import the necessary components from the Dialog module
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Database } from "@/lib/schema";
type Species = Database["public"]["Tables"]["species"]["Row"];

// Define the ConfirmDeleteDialog component, which is the default component
export default function ConfirmDeleteDialog({ species }: { species: Species }) {
  const router = useRouter(); // Get the router object

  // Control open/closed state of the dialog
  const [open, setOpen] = useState<boolean>(false);

  // Define the handleDelete function, which deletes the species from the database
  const handleDelete = async () => {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("species").delete().eq("id", species.id);
    const { error: commentsError } = await supabase.from("comments").delete().eq("species_id", species.id);

    // Catch and report errors from Supabase and exit the onDelete function with an early 'return' if an error occurred.
    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    // Catch and report errors from Supabase and exit the onDelete function with an early 'return' if an error occurred.
    if (commentsError) {
      return toast({
        title: "Comments for the species were not deleted.",
        description: commentsError.message,
        variant: "destructive",
      });
    }

    setOpen(false);

    // Refresh all server components in the current route. This helps display the updated list of species.
    router.refresh();

    return toast({
      title: "Species deleted!",
      description: "Successfully deleted " + species.scientific_name + ".",
    });
  };

  // Render the ConfirmDeleteDialog component
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="mt-3">
          <Icons.trash className=" h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this species? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              handleDelete().catch((error) => {
                // Log any errors to the console
                console.error("Error deleting species:", error);
              });
            }}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
