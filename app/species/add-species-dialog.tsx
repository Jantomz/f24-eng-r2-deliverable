"use client";

// Import the necessary components from the Dialog module
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Define kingdom enum for use in Zod schema and displaying dropdown options in the form
const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);

// Use Zod to define the shape + requirements of a Species entry; used in form validation
const speciesSchema = z.object({
  scientific_name: z
    .string()
    .trim()
    .min(1)
    .transform((val) => val?.trim()),
  common_name: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  kingdom: kingdoms,
  total_population: z.number().int().positive().min(1).nullable(),
  image: z
    .string()
    .url()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  description: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
});

type FormData = z.infer<typeof speciesSchema>;

// Default values for the form fields.
/* Because the react-hook-form (RHF) used here is a controlled form (not an uncontrolled form),
fields that are nullable/not required should explicitly be set to `null` by default.
Otherwise, they will be `undefined` by default, which will raise warnings because `undefined` conflicts with controlled components.
All form fields should be set to non-undefined default values.
Read more here: https://legacy.react-hook-form.com/api/useform/
*/
const defaultValues: Partial<FormData> = {
  scientific_name: "",
  common_name: null,
  kingdom: "Animalia",
  total_population: null,
  image: null,
  description: null,
};

// This dialog is the primary function, hence the 'default' export
export default function AddSpeciesDialog({ userId }: { userId: string }) {
  // takes in the userId for keeping track of author
  const router = useRouter(); // Next.js router for navigation and refreshing the page

  // Control open/closed state of the dialog
  const [open, setOpen] = useState<boolean>(false);
  const [scientificName, setScientificName] = useState<string | null>(null); // State for the scientific name input, used for wikipedia functionality

  // Instantiate form functionality with React Hook Form, passing in the Zod schema (for validation) and default values
  const form = useForm<FormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues,
    mode: "onChange",
  });

  // Define a type for the response from the Wikipedia API
  interface WikipediaResponse {
    extract?: string;
    thumbnail?: {
      source?: string;
    };
  }

  // Function to fetch species information from Wikipedia
  const handleGetInfo = async (scientific_name: string) => {
    // Fetch species information from Wikipedia
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${scientific_name}?redirect=false&origin=*`,
    );

    // Parse the response as JSON
    const data: WikipediaResponse = (await response.json()) as WikipediaResponse;

    // If the response status is not 200, display an error toast
    if (response.status !== 200) {
      return toast({
        title: "Sorry!",
        description: "Species not found on Wikipedia",
        variant: "destructive",
      });
    }

    // Set the form values to the fetched data, if available, thus autofilling the form
    form.setValue("description", data.extract ?? "");
    form.setValue("image", data.thumbnail?.source ?? "");
  };

  // Function to handle form submission
  const onSubmit = async (input: FormData) => {
    // The `input` prop contains data that has already been processed by zod. We can now use it in a supabase query
    const supabase = createBrowserSupabaseClient();

    // Insert the new species into the database
    const { error } = await supabase.from("species").insert([
      {
        author: userId,
        common_name: input.common_name,
        description: input.description,
        kingdom: input.kingdom,
        scientific_name: input.scientific_name,
        total_population: input.total_population,
        image: input.image,
      },
    ]);

    // Catch and report errors from Supabase and exit the onSubmit function with an early 'return' if an error occurred.
    if (error) {
      return toast({
        title: "Sorry! Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    // Because Supabase errors were caught above, the remainder of the function will only execute upon a successful edit

    // Reset form values to the default (empty) values.
    // Practically, this line can be removed because router.refresh() also resets the form. However, we left it as a reminder that you should generally consider form "cleanup" after an add/edit operation.
    form.reset(defaultValues);
    setOpen(false);

    // Refresh all server components in the current route. This helps display the newly created species because species are fetched in a server component, species/page.tsx.
    // Refreshing that server component will display the new species from Supabase
    router.refresh();

    // Display a success toast
    return toast({
      title: "New species added!",
      description: "Successfully added " + input.scientific_name + ".",
    });
  };

  // Render the dialog
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Icons.add className="mr-3 h-5 w-5" />
          Add Species
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Species</DialogTitle>
          <DialogDescription>
            Add a new species here. Click &quot;Add Species&quot; below when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <Input
          onChange={(e) => {
            // Update the scientificName state when the input changes
            setScientificName(e.target.value);
          }}
          placeholder="Add Scientific or Common Name to Autofill"
        ></Input>
        <Button
          type="button"
          onClick={() => {
            if (scientificName) {
              // Call the handleGetInfo function to fetch species information from Wikipedia
              handleGetInfo(scientificName).catch((error) => {
                console.error(error);
              });
            }
          }}
        >
          Autofill with Wikipedia
        </Button>
        <Form {...form}>
          <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSubmit)(e)}>
            <div className="grid w-full items-center gap-4">
              <FormField
                control={form.control}
                name="scientific_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scientific Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Cavia porcellus" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="common_name"
                render={({ field }) => {
                  // We must extract value from field and convert a potential defaultValue of `null` to "" because inputs can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Common Name</FormLabel>
                      <FormControl>
                        <Input value={value ?? ""} placeholder="Guinea pig" {...rest} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="kingdom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kingdom</FormLabel>
                    <Select onValueChange={(value) => field.onChange(kingdoms.parse(value))} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a kingdom" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {kingdoms.options.map((kingdom, index) => (
                            <SelectItem key={index} value={kingdom}>
                              {kingdom}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_population"
                render={({ field }) => {
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Total population</FormLabel>
                      <FormControl>
                        {/* Using shadcn/ui form with number: https://github.com/shadcn-ui/ui/issues/421 */}
                        <Input
                          type="number"
                          value={value ?? ""}
                          placeholder="300000"
                          {...rest}
                          onChange={(event) => field.onChange(+event.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => {
                  // We must extract value from field and convert a potential defaultValue of `null` to "" because inputs can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input
                          value={value ?? ""}
                          placeholder="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/George_the_amazing_guinea_pig.jpg/440px-George_the_amazing_guinea_pig.jpg"
                          {...rest}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => {
                  // We must extract value from field and convert a potential defaultValue of `null` to "" because textareas can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                  const { value, ...rest } = field;
                  return (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          value={value ?? ""}
                          placeholder="The guinea pig or domestic guinea pig, also known as the cavy or domestic cavy, is a species of rodent belonging to the genus Cavia in the family Caviidae."
                          {...rest}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <div className="flex">
                <Button type="submit" className="ml-1 mr-1 flex-auto">
                  Add Species
                </Button>
                <DialogClose asChild>
                  <Button type="button" className="ml-1 mr-1 flex-auto" variant="secondary">
                    Cancel
                  </Button>
                </DialogClose>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
