import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle2, Users, Lock, Mail } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SiGoogle, SiLinkedin } from "react-icons/si";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

// Form validation schemas
const loginSchema = z.object({
  username: z.string().email("Please enter a valid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = z.object({
  username: z.string().email("Please enter a valid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function handleLogin(data: LoginForm) {
    setIsLoading(true);
    try {
      console.log("[Auth] Login attempt:", data.username);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.username.toLowerCase(),
          password: data.password,
        }),
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok) {
        console.log("[Auth] Login successful:", data.username);
        toast({
          title: "Success",
          description: "Login successful",
        });
        setLocation(showAdminLogin ? "/admin" : "/client");
      } else {
        console.log("[Auth] Login failed:", result.message);
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Invalid credentials",
        });
      }
    } catch (error: any) {
      console.error("[Auth] Login error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred during login. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(data: RegisterForm) {
    setIsLoading(true);
    try {
      if (showAdminLogin) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Admin accounts can only be created by existing administrators",
        });
        return;
      }

      console.log("[Auth] Registration attempt:", data.username);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.username.toLowerCase(),
          password: data.password,
          role: "client",
        }),
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok) {
        console.log("[Auth] Registration successful:", data.username);
        toast({
          title: "Success",
          description: "Registration successful. Please log in.",
        });
        setIsLogin(true);
      } else {
        console.log("[Auth] Registration failed:", result.message);
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Registration failed",
        });
      }
    } catch (error: any) {
      console.error("[Auth] Registration error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred during registration. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSocialLogin(provider: 'google' | 'linkedin') {
    try {
      console.log(`[Auth] Initiating ${provider} login`);
      const response = await fetch(`/api/auth/${provider}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok && result.authUrl) {
        window.location.href = result.authUrl;
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: `${provider} login is currently unavailable`
        });
      }
    } catch (error: any) {
      console.error(`[Auth] ${provider} login error:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to initiate ${provider} login`
      });
    }
  }

  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
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

          {isLogin ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="email" 
                            placeholder="Enter your email" 
                            className="pl-10"
                            disabled={isLoading}
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="password" 
                            placeholder="Enter your password" 
                            className="pl-10"
                            disabled={isLoading}
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="link"
                  className="px-0"
                  onClick={() => setShowForgotPassword(true)}
                  disabled={isLoading}
                >
                  Forgot password?
                </Button>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="email" 
                            placeholder="Enter your email" 
                            className="pl-10"
                            disabled={isLoading}
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="password" 
                            placeholder="Enter your password" 
                            className="pl-10"
                            disabled={isLoading}
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="password" 
                            placeholder="Confirm your password" 
                            className="pl-10"
                            disabled={isLoading}
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </Form>
          )}

          {!showAdminLogin && (
            <>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mb-2"
                  onClick={() => handleSocialLogin('google')}
                  disabled={isLoading}
                >
                  <SiGoogle className="mr-2 h-4 w-4" />
                  Continue with Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSocialLogin('linkedin')}
                  disabled={isLoading}
                >
                  <SiLinkedin className="mr-2 h-4 w-4" />
                  Continue with LinkedIn
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full mt-4"
                onClick={() => setIsLogin(!isLogin)}
                disabled={isLoading}
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
              </Button>
            </>
          )}

          <div className="text-center text-sm text-gray-500 mt-4">
            {showAdminLogin 
              ? "Administrative access for managing clients and system" 
              : (isLogin 
                ? "Access your client portal to manage documents and projects"
                : "Create an account to start managing your documents and projects")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}