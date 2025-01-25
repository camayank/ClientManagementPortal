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
  const [isLogin, setIsLogin] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
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
      // Admin users can only login, not register
      if (showAdminLogin && !isLogin) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Admin accounts can only be created by existing administrators",
        });
        return;
      }

      // Set role based on admin toggle
      data.role = showAdminLogin ? "admin" : "client";
      const result = await (isLogin ? login(data) : register(data));

      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      } else {
        // Redirect based on role
        setLocation(showAdminLogin ? "/admin" : "/client");
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
            <Tabs 
              value={showAdminLogin ? "admin" : "client"} 
              onValueChange={(value) => {
                setShowAdminLogin(value === "admin");
                setIsLogin(value === "admin" ? true : isLogin);
              }}
            >
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Enter your email" 
                        {...field} 
                      />
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
                      <Input 
                        type="password" 
                        placeholder="Enter your password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                {isLogin ? "Login" : "Create Account"}
              </Button>

              {!showAdminLogin && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
                </Button>
              )}

              <div className="text-center text-sm text-gray-500">
                {showAdminLogin 
                  ? "Administrative access for managing clients and system" 
                  : (isLogin 
                    ? "Access your client portal to manage documents and projects"
                    : "Create an account to start managing your documents and projects")}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}