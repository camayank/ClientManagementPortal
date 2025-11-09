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
import { UserCircle2, Users, Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const passwordResetRequestSchema = z.object({
  username: z.string().email("Please enter a valid email address"),
});

const passwordResetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordResetRequestForm = z.infer<typeof passwordResetRequestSchema>;
type PasswordResetForm = z.infer<typeof passwordResetSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [resetStep, setResetStep] = useState<'login' | 'request' | 'reset'>('login');
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

  const resetRequestForm = useForm<PasswordResetRequestForm>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: {
      username: "",
    },
  });

  const resetForm = useForm<PasswordResetForm>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      token: "",
      newPassword: "",
      confirmPassword: "",
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

  async function onRequestPasswordReset(data: PasswordResetRequestForm) {
    try {
      const response = await fetch('/api/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Check your email",
        description: "If an account exists with this email, you will receive a password reset link.",
      });

      // In development, show the reset form directly
      if (process.env.NODE_ENV === 'development') {
        setResetStep('reset');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  }

  async function onResetPassword(data: PasswordResetForm) {
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: "Your password has been reset. Please login with your new password.",
      });

      setResetStep('login');
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
          {resetStep === 'login' && (
            <>
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
                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isLogin ? "Logging in..." : "Creating account..."}
                      </>
                    ) : (
                      isLogin ? "Login" : "Create Account"
                    )}
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

                  {isLogin && (
                    <Button
                      type="button"
                      variant="link"
                      className="w-full"
                      onClick={() => setResetStep('request')}
                    >
                      Forgot password?
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
            </>
          )}

          {resetStep === 'request' && (
            <Form {...resetRequestForm}>
              <form onSubmit={resetRequestForm.handleSubmit(onRequestPasswordReset)} className="space-y-4">
                <FormField
                  control={resetRequestForm.control}
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
                <Button type="submit" className="w-full" disabled={resetRequestForm.formState.isSubmitting}>
                  {resetRequestForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setResetStep('login')}
                >
                  Back to Login
                </Button>
              </form>
            </Form>
          )}

          {resetStep === 'reset' && (
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
                <FormField
                  control={resetForm.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reset Token</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter the reset token from your email" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter your new password" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Confirm your new password" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={resetForm.formState.isSubmitting}>
                  {resetForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting password...
                    </>
                  ) : (
                    "Set New Password"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setResetStep('login')}
                >
                  Back to Login
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}