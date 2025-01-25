import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useUser } from "@/hooks/use-user";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { NewUser } from "@db/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle2, Users } from "lucide-react";

export default function AuthPage() {
  const [role, setRole] = useState<"client" | "admin">("client");
  const { login, register } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<NewUser>({
    defaultValues: {
      username: "",
      password: "",
      role: "client",
    },
  });

  async function onSubmit(data: NewUser) {
    try {
      // Update the role based on the toggle
      data.role = role;
      const result = await (true ? login(data) : register(data)); //Consider revisiting this logic.  Should it be login always or a conditional?
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      } else {
        // Redirect based on role
        setLocation(role === "admin" ? "/admin" : "/client");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Welcome to CA4CPA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Tabs value={role} onValueChange={(value) => setRole(value as "client" | "admin")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="client" className="flex items-center gap-2">
                  <UserCircle2 className="w-4 h-4" />
                  Client Portal
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Admin Portal
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Login
              </Button>
              <div className="text-center text-sm text-gray-500">
                {role === "client" 
                  ? "Access your client portal to manage documents and projects"
                  : "Administrative access for managing clients and system"}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}