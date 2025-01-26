import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useUser } from "@/hooks/use-user";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle2, Users, Lock, Mail } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SiGoogle, SiLinkedin } from "react-icons/si";

// Form validation schemas
const loginSchema = z.object({
  username: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const mfaSchema = z.object({
  token: z.string().length(6, "Token must be 6 digits"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;
type MFAForm = z.infer<typeof mfaSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const { login, register } = useUser();
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

  const mfaForm = useForm<MFAForm>({
    resolver: zodResolver(mfaSchema),
    defaultValues: {
      token: "",
    },
  });

  async function handleLogin(data: LoginForm) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
          role: showAdminLogin ? "admin" : "client",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.requiresMfa) {
          setMfaRequired(true);
          setTempToken(result.tempToken);
          toast({
            title: "MFA Required",
            description: "Please enter your MFA code",
          });
        } else {
          toast({
            title: "Success",
            description: "Login successful",
          });
          setLocation(showAdminLogin ? "/admin" : "/client");
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Login failed",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  }

  async function handleRegister(data: RegisterForm) {
    try {
      if (showAdminLogin) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Admin accounts can only be created by existing administrators",
        });
        return;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
          role: "client",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Registration successful. Please log in.",
        });
        setIsLogin(true);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Registration failed",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  }

  async function handleMfaVerify(data: MFAForm) {
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ token: data.token }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "MFA verification successful",
        });
        setLocation(showAdminLogin ? "/admin" : "/client");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "MFA verification failed",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  }

  function handleSocialLogin(provider: string) {
    window.location.href = `/auth/${provider}`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Welcome to CA4CPA</CardTitle>
        </CardHeader>
        <CardContent>
          {!mfaRequired ? (
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
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">
                      Login
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
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">
                      Create Account
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
                    >
                      <SiGoogle className="mr-2 h-4 w-4" />
                      Continue with Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSocialLogin('linkedin')}
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
            </>
          ) : (
            <Form {...mfaForm}>
              <form onSubmit={mfaForm.handleSubmit(handleMfaVerify)} className="space-y-4">
                <FormField
                  control={mfaForm.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MFA Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter 6-digit code" 
                          {...field} 
                          maxLength={6}
                          className="text-center tracking-widest text-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Verify
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setMfaRequired(false);
                    setTempToken("");
                  }}
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