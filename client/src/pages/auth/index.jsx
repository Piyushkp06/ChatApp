import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { SIGNUP_ROUTE, LOGIN_ROUTE } from "@/utils/constants";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";
import { Mail, Lock, Eye, EyeOff, Sparkles, MessageCircle, Users, Zap, Check, X } from "lucide-react";

function Auth() {
  const navigate = useNavigate();
  const { setUserInfo } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  /**
   * Password validation
   * Requirements:
   * - Minimum 8 characters
   * - At least 1 uppercase letter
   * - At least 1 lowercase letter  
   * - At least 1 number
   * - At least 1 special character
   */
  const validatePassword = (password) => {
    const errors = [];
    
    if (!password || password.length < 8) {
      errors.push("Password must be at least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Must contain uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Must contain lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Must contain a number");
    }
    if (!/[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/~`]/.test(password)) {
      errors.push("Must contain special character");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Get individual password requirement checks for visual feedback
  const getPasswordRequirements = (pwd) => {
    return [
      { label: "8+ characters", met: pwd.length >= 8 },
      { label: "Uppercase letter", met: /[A-Z]/.test(pwd) },
      { label: "Lowercase letter", met: /[a-z]/.test(pwd) },
      { label: "Number", met: /[0-9]/.test(pwd) },
      { label: "Special character", met: /[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/~`]/.test(pwd) },
    ];
  };

  // Calculate password strength (0-5)
  const getPasswordStrength = (pwd) => {
    if (!pwd) return 0;
    const requirements = getPasswordRequirements(pwd);
    return requirements.filter(r => r.met).length;
  };

  const validateLogin = () => {
    if (!email.length) {
      toast.error("Email is required");
      return false;
    }
    if (!validateEmail(email)) {
      toast.error("Email is not valid");
      return false;
    }
    if (!password.length) {
      toast.error("Password is required");
      return false;
    }
    return true;
  };

  const validateSignup = () => {
    if (!email.length) {
      toast.error("Email is required");
      return false;
    }
    if (!validateEmail(email)) {
      toast.error("Email is not valid");
      return false;
    }
    if (!password.length) {
      toast.error("Password is required");
      return false;
    }
    
    // Validate password strength
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      toast.error(passwordCheck.errors[0]);
      return false;
    }
    
    if (!confirmPassword.length) {
      toast.error("Confirm Password is required");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (validateLogin()) {
      setIsLoading(true);
      try {
        const response = await apiClient.post(
          LOGIN_ROUTE,
          { email, password },
          { withCredentials: true }
        );
        toast.success("Welcome back!");
        if (response.data.user.id) {
          setUserInfo(response.data.user);
          if (response.data.user.profileSetup) navigate("/chat");
          else navigate("/profile");
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Login failed");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSignup = async () => {
    if (validateSignup()) {
      setIsLoading(true);
      try {
        const response = await apiClient.post(SIGNUP_ROUTE, { email, password }, { withCredentials: true });
        toast.success("Account created successfully!");
        setUserInfo(response.data.user);
        navigate("/profile");
      } catch (error) {
        toast.error(error.response?.data?.message || "Signup failed");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const features = [
    { icon: MessageCircle, title: "Real-time Chat", desc: "Instant messaging with friends" },
    { icon: Users, title: "Group Channels", desc: "Create and join group conversations" },
    { icon: Zap, title: "AI Powered", desc: "Smart suggestions and assistance" },
  ];

  return (
    <div className="min-h-screen w-full flex dark bg-[#0a0a0f] overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px] animate-pulse delay-500" />
      </div>

      {/* Left Panel - Features */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center p-12 relative">
        <div className="max-w-md space-y-8 animate-fade-in">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center glow">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white">Syncronus</h1>
            </div>
            <p className="text-lg text-gray-400">
              Connect, chat, and collaborate with your team in real-time.
            </p>
          </div>

          <div className="space-y-6 pt-8">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="flex items-start gap-4 p-4 rounded-2xl glass hover:bg-white/10 transition-all duration-300 group"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <Card className="w-full max-w-md bg-[#12121a]/80 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">Syncronus</span>
            </div>
            <CardTitle className="text-2xl font-bold text-white">Welcome</CardTitle>
            <CardDescription className="text-gray-400">
              Sign in to continue your conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/5 p-1 rounded-xl mb-6">
                <TabsTrigger 
                  value="login" 
                  className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white text-gray-400 transition-all"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white text-gray-400 transition-all"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-0">
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <Input
                      placeholder="Email address"
                      type="email"
                      className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <Input
                      placeholder="Password"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <Button 
                    className="w-full h-12 gradient-primary hover:opacity-90 text-white font-semibold rounded-xl glow-sm transition-all duration-300"
                    onClick={handleLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </div>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-0">
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <Input
                      placeholder="Email address"
                      type="email"
                      className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <Input
                      placeholder="Password"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {password.length > 0 && (
                    <div className="space-y-2 px-1">
                      {/* Strength Bar */}
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              getPasswordStrength(password) >= level
                                ? getPasswordStrength(password) <= 2
                                  ? 'bg-red-500'
                                  : getPasswordStrength(password) <= 3
                                  ? 'bg-yellow-500'
                                  : getPasswordStrength(password) <= 4
                                  ? 'bg-blue-500'
                                  : 'bg-green-500'
                                : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                      
                      {/* Requirements Checklist */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {getPasswordRequirements(password).map((req, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-1.5 transition-colors ${
                              req.met ? 'text-green-400' : 'text-gray-500'
                            }`}
                          >
                            {req.met ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                            <span>{req.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <Input
                      placeholder="Confirm password"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full h-12 gradient-primary hover:opacity-90 text-white font-semibold rounded-xl glow-sm transition-all duration-300"
                    onClick={handleSignup}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating account...
                      </div>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <p className="text-center text-sm text-gray-500 mt-6">
              By continuing, you agree to our{" "}
              <span className="text-violet-400 hover:text-violet-300 cursor-pointer">Terms</span>{" "}
              and{" "}
              <span className="text-violet-400 hover:text-violet-300 cursor-pointer">Privacy Policy</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Auth;
