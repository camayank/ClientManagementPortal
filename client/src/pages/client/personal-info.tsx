import { ClientLayout } from "@/components/layouts/ClientLayout";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const personalInfoSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/, "Invalid SSN format (XXX-XX-XXXX)"),
  address: z.string().min(1, "Physical address is required"),
  dob: z.string().min(1, "Date of birth is required"),
});

type PersonalInfo = z.infer<typeof personalInfoSchema>;

export default function PersonalInfo() {
  const { toast } = useToast();
  const { user } = useUser();

  const form = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: "",
      ssn: "",
      address: "",
      dob: "",
    },
  });

  const onSubmit = async (data: PersonalInfo) => {
    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: "Personal information updated successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Personal Info</h1>
          <div className="space-x-2">
            <Button variant="outline">Edit Your Details</Button>
            <Button>Save</Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name (First and Last)</FormLabel>
                    <FormControl>
                      <Input placeholder="Type here" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Typing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Typing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ssn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Social Security Number (SSN)</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="XXX-XX-XXXX"
                        {...field}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length > 9) value = value.slice(0, 9);
                          if (value.length >= 5) {
                            value = value.slice(0, 3) + '-' + value.slice(3, 5) + '-' + value.slice(5);
                          } else if (value.length >= 3) {
                            value = value.slice(0, 3) + '-' + value.slice(3);
                          }
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Physical Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Typing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
      </div>
    </ClientLayout>
  );
}
