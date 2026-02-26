import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { ADD_PROFILE_IMAGE_ROUTE, REMOVE_PROFILE_IMAGE_ROUTE, UPDATE_PROFILE_ROUTE, HOST } from '@/utils/constants';
import { colors, getColor } from '@/lib/utils';
import { ArrowLeft, Camera, Trash2, User, Mail, Sparkles, Check } from 'lucide-react';

function Profile() {
  const navigate = useNavigate();
  const { userInfo, setUserInfo } = useAppStore();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [image, setImage] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [selectedColor, setSelectedColor] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (userInfo.profileSetup) {
      setFirstName(userInfo.firstName);
      setLastName(userInfo.lastName);
      setSelectedColor(userInfo.color);
    }
    if (userInfo.image) {
      setImage(`${HOST}/${userInfo.image}`);
    }
  }, [userInfo]);

  const validateProfile = () => {
    if (!firstName.trim()) {
      toast.error("First name is required");
      return false;
    }
    if (!lastName.trim()) {
      toast.error("Last name is required");
      return false;
    }
    return true;
  };

  const saveChanges = async () => {
    if (validateProfile()) {
      setIsLoading(true);
      try {
        const response = await apiClient.post(
          UPDATE_PROFILE_ROUTE,
          { firstName, lastName, color: selectedColor },
          { withCredentials: true }
        );
        if (response.status === 200 && response.data) {
          setUserInfo({ ...response.data });
          toast.success("Profile updated successfully!");
          navigate("/chat");
        }
      } catch (error) {
        console.log(error);
        toast.error("Failed to update profile");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleNavigate = () => {
    if (userInfo.profileSetup) {
      navigate("/chat");
    } else {
      toast.error("Please complete your profile setup");
    }
  };

  const handleFileInputClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("profile-image", file);
      try {
        const response = await apiClient.post(ADD_PROFILE_IMAGE_ROUTE, formData, { withCredentials: true });
        if (response.status === 200 && response.data.image) {
          setUserInfo({ ...userInfo, image: response.data.image });
          toast.success("Profile photo updated!");
        }
        const reader = new FileReader();
        reader.onload = () => {
          setImage(reader.result);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        toast.error("Failed to upload image");
      }
    }
  };

  const handleDeleteImage = async () => {
    try {
      const response = await apiClient.delete(REMOVE_PROFILE_IMAGE_ROUTE, {
        withCredentials: true,
      });
      if (response.status === 200) {
        setUserInfo({ ...userInfo, image: null });
        toast.success("Profile photo removed");
        setImage(null);
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to remove image");
    }
  };

  return (
    <div className="min-h-screen w-full dark bg-[#0a0a0f] flex items-center justify-center p-6 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-2xl relative z-10 animate-fade-in">
        {/* Back Button */}
        <button
          onClick={handleNavigate}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span>{userInfo.profileSetup ? "Back to Chat" : "Setup Required"}</span>
        </button>

        <Card className="bg-[#12121a]/80 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              {userInfo.profileSetup ? "Edit Profile" : "Complete Your Profile"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {userInfo.profileSetup
                ? "Update your personal information"
                : "Add your details to get started with Syncronus"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Avatar Section */}
            <div className="flex justify-center">
              <div
                className="relative group"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
              >
                <Avatar className="h-32 w-32 rounded-2xl ring-4 ring-violet-500/20 transition-all group-hover:ring-violet-500/40">
                  {image ? (
                    <AvatarImage src={image} alt="profile" className="object-cover" />
                  ) : (
                    <AvatarFallback
                      className={`${getColor(selectedColor)} text-4xl font-semibold rounded-2xl`}
                    >
                      {firstName ? firstName[0].toUpperCase() : userInfo.email[0].toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>

                {/* Hover Overlay */}
                <div
                  className={`
                    absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center gap-3
                    transition-opacity cursor-pointer
                    ${hovered ? "opacity-100" : "opacity-0"}
                  `}
                >
                  {image ? (
                    <>
                      <button
                        className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                        onClick={handleFileInputClick}
                      >
                        <Camera className="h-5 w-5 text-white" />
                      </button>
                      <button
                        className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                        onClick={handleDeleteImage}
                      >
                        <Trash2 className="h-5 w-5 text-red-400" />
                      </button>
                    </>
                  ) : (
                    <button
                      className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                      onClick={handleFileInputClick}
                    >
                      <Camera className="h-5 w-5 text-white" />
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleImageChange}
                  name="profile-image"
                  accept=".png,.jpg,.jpeg,.svg,.webp"
                />
              </div>
            </div>

            <Separator className="bg-white/5" />

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Email (Read Only) */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <Input
                  type="email"
                  disabled
                  value={userInfo.email}
                  className="h-12 bg-white/5 border-white/10 text-gray-400 rounded-xl"
                />
              </div>

              {/* First Name */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  First Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Last Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl"
                />
              </div>
            </div>

            <Separator className="bg-white/5" />

            {/* Color Selection */}
            <div className="space-y-3">
              <label className="text-sm text-gray-400">Choose your avatar color</label>
              <div className="flex gap-3 flex-wrap">
                {colors.map((color, index) => (
                  <button
                    key={index}
                    className={`
                      h-10 w-10 rounded-xl ${color} transition-all duration-200
                      ${selectedColor === index
                        ? "ring-2 ring-white ring-offset-2 ring-offset-[#12121a] scale-110"
                        : "hover:scale-105"
                      }
                    `}
                    onClick={() => setSelectedColor(index)}
                  >
                    {selectedColor === index && (
                      <Check className="h-5 w-5 text-white mx-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <Button
              className="w-full h-12 gradient-primary hover:opacity-90 text-white font-semibold rounded-xl glow-sm transition-all duration-300"
              onClick={saveChanges}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Profile;
