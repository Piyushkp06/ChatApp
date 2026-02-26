import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/api-client';
import { LOGOUT_ROUTE, HOST } from '@/utils/constants';
import { getColor } from '@/lib/utils';
import { Settings, LogOut, ChevronRight } from 'lucide-react';

function ProfileInfo() {
  const { userInfo, setUserInfo } = useAppStore();
  const navigate = useNavigate();

  const logout = async () => {
    try {
      const response = await apiClient.post(LOGOUT_ROUTE, {}, { withCredentials: true });
      if (response.status === 200) {
        setUserInfo(null);
        navigate("/auth");
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="p-3">
      <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
           onClick={() => navigate('/profile')}>
        {/* Avatar */}
        <Avatar className="h-10 w-10 rounded-xl ring-2 ring-violet-500/20">
          {userInfo.image ? (
            <AvatarImage
              src={`${HOST}/${userInfo.image}`}
              alt="profile"
              className="object-cover"
            />
          ) : (
            <AvatarFallback className={`${getColor(userInfo.color)} text-sm font-medium`}>
              {userInfo.firstName
                ? userInfo.firstName[0].toUpperCase()
                : userInfo.email[0].toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {userInfo.firstName && userInfo.lastName
              ? `${userInfo.firstName} ${userInfo.lastName}`
              : userInfo.email}
          </p>
          <p className="text-xs text-gray-500 truncate">{userInfo.email}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-gray-400 hover:text-violet-400 hover:bg-violet-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/profile');
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1a1a24] border-white/10">
                Settings
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    logout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1a1a24] border-white/10">
                Logout
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

export default ProfileInfo;
