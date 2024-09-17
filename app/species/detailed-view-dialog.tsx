"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
// Import the necessary components from the Dialog module
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
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type Species = Database["public"]["Tables"]["species"]["Row"];
type Comments = Database["public"]["Tables"]["comments"]["Row"];

// Define the DetailedViewDialog component, which is the default component
export default function DetailedViewDialog({ userId, species }: { userId: string; species: Species }) {
  // Control open/closed state of the dialog
  const [open, setOpen] = useState<boolean>(false);

  // Define a few useState functions to keep track of current user states
  const [userComment, setUserComment] = useState("");
  const [isAscending, setIsAscending] = useState<boolean>(true);
  const [userDisplayName, setUserDisplayName] = useState("");
  const [comments, setComments] = useState<Comments[] | null>(null);

  const fetchComments = useCallback(async () => {
    if (open) {
      const supabase = createBrowserSupabaseClient();

      // Fetch the comments from the comments table
      const { data: commentsList, error } = await supabase.from("comments").select("*").eq("species_id", species.id);

      // Catch and report errors from Supabase and exit the fetchComments function with an early 'return' if an error occurred.
      if (error) {
        console.error("Error fetching comments:", error);
        return;
      }

      // Set the comments in the state
      setComments(commentsList);
    }
  }, [open, species.id]);

  // Fetch the user display name from the profiles table immediately when rendered, and only once
  useEffect(() => {
    if (open) {
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

      // Call the fetchComments function
      fetchComments().catch((e) => {
        console.error("Error fetching comments:", e);
      });
    }
  }, [open, fetchComments, userId]);

  // Define the handleDeleteComment function, which deletes a comment from the species table
  const handleDeleteComment = async (commentId: number) => {
    const supabase = createBrowserSupabaseClient();

    // comments has an error, as the database forma and updatedComments format are not the same, will have to consult team members
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("species_id", species.id)
      .eq("author", userId)
      .eq("id", commentId);

    // Catch and report errors from Supabase and exit the handleDeleteComment function with an early 'return' if an error occurred.
    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    // to avoid reloading, we will call the fetchComments function to update the comments state
    fetchComments().catch((e) => {
      console.error("Error fetching comments:", e);
    });

    // Display a toast notification to the user
    return toast({
      title: "Comment deleted!",
      description: "Successfully deleted the comment.",
    });
  };

  // Define the handleCommentPost function, which posts a comment to the species table
  const handleCommentPost = async () => {
    const supabase = createBrowserSupabaseClient();

    // Update the comments field in the species table with the new comment
    const { error } = await supabase.from("comments").insert({
      author: userId,
      display_name: userDisplayName,
      comment: userComment,
      species_id: species.id,
    });

    // Catch and report errors from Supabase and exit the onSubmit function with an early 'return' if an error occurred.
    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    // to avoid reloading, we will call the fetchComments function to update the comments state
    fetchComments().catch((e) => {
      console.error("Error fetching comments:", e);
    });

    // Clear the comment input box
    setUserComment("");

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
          <Image
            src={species.image ? species.image : "/default-image.png"} // Default image if no image is provided, in public
            alt={species.scientific_name}
            className="w-1/2"
            width={300}
            height={500}
          ></Image>
        </div>
        <DialogDescription className="mt-3">
          Total Population: {species.total_population ? species.total_population : "Unknown"}
        </DialogDescription>
        <DialogDescription>Kingdom: {species.kingdom}</DialogDescription>
        <h3 className="mt-3 text-xl font-semibold">Description</h3>
        <p>{species.description}</p>

        <div className="flex justify-between">
          <DialogDescription className="mt-3">Comments:</DialogDescription>
          <Button variant="outline" onClick={() => setIsAscending(!isAscending)}>
            {isAscending ? "Showing Newest First" : "Showing Oldest First"}
          </Button>
        </div>

        {!isAscending &&
          comments
            ?.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((comment, index) => (
              <div key={index} className="mt-2 rounded border-2 p-2">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row justify-between">
                    <p className="font-semibold ">{comment?.display_name}</p>
                    <p className="font-normal">
                      {new Date(comment?.created_at).toLocaleString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p>{comment?.comment}</p>
                    {comment?.display_name == userDisplayName && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (comments) {
                            handleDeleteComment(comment.id).catch((e) => {
                              console.error("Error deleting comment:", e);
                            });
                          }
                        }}
                      >
                        <Icons.trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        {isAscending &&
          comments
            ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((comment, index) => (
              <div key={index} className="mt-2 rounded border-2 p-2">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row justify-between">
                    <p className="font-semibold ">{comment?.display_name}</p>
                    <p className="font-normal">
                      {new Date(comment?.created_at).toLocaleString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p>{comment?.comment}</p>
                    {comment?.display_name == userDisplayName && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (comments) {
                            handleDeleteComment(comment.id).catch((e) => {
                              console.error("Error deleting comment:", e);
                            });
                          }
                        }}
                      >
                        <Icons.trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
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
