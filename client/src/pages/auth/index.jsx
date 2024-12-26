import React, { useState } from "react";
import Background from "@/assets/login2.png";
import Victory from "@/assets/victory.svg";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@radix-ui/react-tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { SIGNUP_ROUTE,LOGIN_ROUTE } from "@/utils/constants";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";

function Auth() {
  const navigate=useNavigate();
  const {setUserInfo}=useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

  const validateLogin= ()=>{
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
  }
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
    if (!confirmPassword.length) {
      toast.error("ConfirmPassword is required");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Password and Confirm Password should be same");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (validateLogin()) {
      try {
        const response = await apiClient.post(
          LOGIN_ROUTE,
          { email, password },
          { withCredentials: true }
        );
        console.log("Login Response:", response.data);
        toast.success("Login successful!");
        if (response.data.user.id) {
          console.log("response.data.user.id",response.data.user.id);
          setUserInfo(response.data.user);
          if (response.data.user.profileSetup) navigate("/chat");
          else navigate("/profile");
        }
      } catch (error) {
        console.error("Login Error:", error);
        toast.error(
          error.response?.data?.message || "An error occurred during login"
        );
      }
    }
  };
  
  const handleSignup = async () => {
    if (validateSignup()) {
      try {
        const response = await apiClient.post(SIGNUP_ROUTE, { email, password },{withCredentials:true});
        console.log("Signup Response:", response.data);
        toast.success("Signup successful!");
        setUserInfo(response.data.user);
        navigate("/profile")
      } catch (error) {
        console.error("Signup Error:", error);
        toast.error(
          error.response?.data?.message || "An error occurred during signup"
        );
      }
    }
  };

  return (
    <div className="h-[100vh] w-[100vw] flex items-center justify-center">
      <div className="h-[80vh] bg-white border-2 border-white text-opacity-90 shadow-2xl w-[80vw] md:w-[90vw] lg:w-[70vw] xl:w-[60vw] rounded-3xl grid xl:grid-cols-2">
        {/* Left Section */}
        <div className="flex flex-col gap-10 items-center justify-center">
          <div className="flex items-center justify-center flex-col">
            <div className="flex items-center justify-center">
              <h1 className="text-5xl font-bold md:text-6xl">Welcome</h1>
              <img src={Victory} alt="Victory Emoji" className="h-[100px]" />
            </div>
            <p className="font-medium text-center">
              Fill in the details to get started with the app!
            </p>
          </div>
          <div className="flex items-center justify-center w-full">
            <Tabs className="w-full" defaultValue="login">
              <TabsList className="flex w-full justify-between bg-transparent">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-transparent text-black text-opacity-90 border-b-2 w-1/2 text-center data-[state=active]:font-semibold data-[state=active]:border-b-purple-500 p-3 transition-all duration-300"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="data-[state=active]:bg-transparent text-black text-opacity-90 border-b-2 w-1/2 text-center data-[state=active]:font-semibold data-[state=active]:border-b-purple-500 p-3 transition-all duration-300"
                >
                  Signup
                </TabsTrigger>
              </TabsList>
              <div className="mt-10 w-full">
                {/* Login Content */}
                <TabsContent
                  className="flex flex-col gap-5 w-full px-10"
                  value="login"
                >
                  <Input
                    placeholder="Email"
                    type="email"
                    className="rounded-full p-4 w-full"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    placeholder="Password"
                    type="password"
                    className="rounded-full p-4 w-full"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button className="rounded-full p-6 w-full" onClick={handleLogin}>
                    Login
                  </Button>
                </TabsContent>

                {/* Signup Content */}
                <TabsContent
                  className="flex flex-col gap-5 w-full px-10"
                  value="signup"
                >
                  <Input
                    placeholder="Email"
                    type="email"
                    className="rounded-full p-4 w-full"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    placeholder="Password"
                    type="password"
                    className="rounded-full p-4 w-full"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Input
                    placeholder="Confirm Password"
                    type="password"
                    className="rounded-full p-4 w-full"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <Button className="rounded-full p-6 w-full" onClick={handleSignup}>
                    Signup
                  </Button>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Right Section */}
        <div className="hidden xl:flex justify-center items-center overflow-hidden rounded-tr-3xl rounded-br-3xl">
          <img
            src={Background}
            alt="background login"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

export default Auth;
