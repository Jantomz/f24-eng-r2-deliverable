"use client";

// Import the necessary components from the Dialog module
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import type { Database } from "@/lib/schema";
import { useEffect, useState } from "react";

type Species = Database["public"]["Tables"]["species"]["Row"];

// Define the DetailedViewDialog component, which is the default component
export default function DetailedViewDialog({ userId, species }: { userId: string; species: Species }) {
  // Control open/closed state of the dialog
  const [open, setOpen] = useState<boolean>(false);

  // Define a few useState functions to keep track of current user states
  const [userComment, setUserComment] = useState("");
  const [isAscending, setIsAscending] = useState<boolean>(true);
  const [userDisplayName, setUserDisplayName] = useState("");

  // Fetch the user display name from the profiles table immediately when rendered, and only once
  useEffect(() => {
    // Define the fetchUserDisplayName function, which fetches the user display name from the profiles table
    const fetchUserDisplayName = async () => {
      const supabase = createBrowserSupabaseClient();

      // Fetch the user display name from the profiles table
      const { data: user, error } = await supabase.from("profiles").select("display_name").eq("id", userId).single();

      // Catch and report errors from Supabase and exit the fetchUserDisplayName function with an early 'return' if an error occurred.
      if (error) {
        console.error("Error fetching user display name:", error);
        return;
      }

      // Set the user display name in the state
      setUserDisplayName(user.display_name);
    };

    // Call the fetchUserDisplayName function
    fetchUserDisplayName().catch((e) => {
      console.error("Error fetching user display name:", e);
    });
  }, []);

  // Define the handleDeleteComment function, which deletes a comment from the species table
  const handleDeleteComment = async (commentIndex: number) => {
    const supabase = createBrowserSupabaseClient();

    const updatedComments = species.comments?.filter((_, i) => i !== commentIndex);

    // comments has an error, as the database forma and updatedComments format are not the same, will have to consult team members
    const { error } = await supabase
      .from("species")
      .update({
        comments: updatedComments, // Update the comments field with the updated comments array
      })
      .eq("id", species.id);

    // Catch and report errors from Supabase and exit the handleDeleteComment function with an early 'return' if an error occurred.
    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    // Reload the page to display the updated comments
    location.reload();

    // Display a toast notification to the user
    return toast({
      title: "Comment deleted!",
      description: "Successfully deleted the comment.",
    });
  };

  // Define the handleCommentPost function, which posts a comment to the species table
  const handleCommentPost = async () => {
    const supabase = createBrowserSupabaseClient();

    // Fetch the user display name from the profiles table
    const { data: user, error: profileError } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    // Catch and report errors from Supabase and exit the handleCommentPost function with an early 'return' if an error occurred.
    if (profileError) {
      console.error("Error fetching user display name:", profileError);
      return;
    }

    // Set the comment of the user
    const newComment = {
      author: user.display_name,
      comment: userComment,
    };

    // Keep track of previous comments, storing in another variable for organization
    const prevComments = species.comments;

    // Create a new array to store all comments together
    const totalComments = [];

    // This was a very roundabout way to hold all the comments together, but it was the only solution that did not create errors
    if (prevComments) {
      for (const comment of prevComments) {
        totalComments.push(comment);
      }
      totalComments.push(newComment);
    } else {
      totalComments.push(newComment);
    }

    // Update the comments field in the species table with the new comment
    const { error } = await supabase
      .from("species")
      .update({
        comments: totalComments, // Same error with comments that needs to be consolidated with team members
      })
      .eq("id", species.id);

    // Catch and report errors from Supabase and exit the onSubmit function with an early 'return' if an error occurred.
    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    // Because Supabase errors were caught above, the remainder of the function will only execute upon a successful edit
    location.reload();

    // Display a toast notification to the user
    return toast({
      title: "Comment added!",
      description: "Successfully commented on " + species.scientific_name + ".",
    });
  };

  // Render the DetailedViewDialog component
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mt-3 w-full">Learn More</Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{species.scientific_name}</DialogTitle>
          <DialogDescription>{species.common_name}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          <img
            src={species.image ? species.image : "/default-image.png"} // Default image if no image is provided, in public
            alt={species.scientific_name}
            className="w-1/2"
          />
        </div>
        <DialogDescription className="mt-3">
          Total Population: {species.total_population ? species.total_population : "Unknown"}
        </DialogDescription>
        <DialogDescription>Kingdom: {species.kingdom}</DialogDescription>
        <h3 className="mt-3 text-xl font-semibold">Description</h3>
        <p>{species.description}</p>

        <DialogDescription className="mt-3">Comments:</DialogDescription>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsAscending(!isAscending)}>
            {isAscending ? "Showing Newest First" : "Showing Oldest First"}
          </Button>
        </div>

        {isAscending &&
          species.comments
            ?.slice()
            .reverse()
            .map((comment, index) => (
              <div key={index} className="mt-2 flex justify-between rounded border-2 p-2">
                <div>
                  <p className="font-semibold ">{comment?.author}</p>
                  <p>{comment?.comment}</p>
                </div>
                {comment?.author == userDisplayName && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (species.comments) {
                        handleDeleteComment(species.comments.length - index - 1).catch((e) => {
                          console.error("Error deleting comment:", e);
                        });
                      }
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            ))}
        {!isAscending &&
          species.comments?.map((comment, index) => (
            <div key={index} className="mt-2 flex justify-between rounded border-2 p-2">
              <div>
                <p className="font-semibold ">{comment?.author}</p>
                <p>{comment?.comment}</p>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  if (species.comments) {
                    handleDeleteComment(index).catch((e) => {
                      console.error("Error deleting comment:", e);
                    });
                  }
                }}
              >
                Delete
              </Button>
            </div>
          ))}

        <Input placeholder="Add a comment..." className="mt-3" onChange={(e) => setUserComment(e.target.value)} />
        <Button
          className="mt-3"
          variant="default"
          onClick={() => {
            handleCommentPost().catch((e) => {
              console.error("Error posting comment:", e);
            });
          }}
        >
          Post Comment
        </Button>
      </DialogContent>
    </Dialog>
  );
}
