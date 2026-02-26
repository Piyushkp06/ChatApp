import React, { useEffect } from 'react';
import ProfileInfo from './components/profile-info';
import NewDm from './components/new-dm';
import apiClient from '@/lib/api-client';
import { GET_DM_CONTACTS_ROUTES, GET_USER_CHANNELS_ROUTE, GET_UNREAD_COUNTS_ROUTE } from '@/utils/constants';
import { useAppStore } from '@/store';
import ContactList from '@/components/contact-list';
import CreateChannel from './components/create-channel';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users, Sparkles } from 'lucide-react';

function ContactsContainer() {
  const { 
    setDirectMessagesContacts, 
    directMessagesContacts, 
    channels, 
    setChannels,
    setUnreadCounts,
    setTotalUnread,
    totalUnread
  } = useAppStore();

  useEffect(() => {
    const getContacts = async () => {
      const response = await apiClient.get(GET_DM_CONTACTS_ROUTES, {
        withCredentials: true,
      });
      if (response.data.contacts) {
        setDirectMessagesContacts(response.data.contacts);
      }
    };
    
    const getChannels = async () => {
      const response = await apiClient.get(GET_USER_CHANNELS_ROUTE, {
        withCredentials: true,
      });
      if (response.data.channels) {
        setChannels(response.data.channels);
      }
    };

    const getUnreadCounts = async () => {
      try {
        const response = await apiClient.get(GET_UNREAD_COUNTS_ROUTE, {
          withCredentials: true,
        });
        if (response.data) {
          setUnreadCounts(response.data.unreadCounts || {});
          setTotalUnread(response.data.totalUnread || 0);
        }
      } catch (error) {
        console.error("Failed to fetch unread counts:", error);
      }
    };
    
    getChannels();
    getContacts();
    getUnreadCounts();
  }, [setChannels, setDirectMessagesContacts, setUnreadCounts, setTotalUnread]);

  return (
    <div className="relative w-full md:w-[320px] lg:w-[360px] xl:w-[380px] h-full flex flex-col bg-[#0d0d12]/95 backdrop-blur-xl border-r border-white/5">
      {/* Header */}
      <div className="p-5 pb-4">
        <Logo />
      </div>

      <ScrollArea className="flex-1 px-3">
        {/* Direct Messages Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-violet-400" />
              <Title text="Direct Messages" />
            </div>
            <NewDm />
          </div>
          <div className="space-y-1">
            <ContactList contacts={directMessagesContacts} />
          </div>
        </div>

        <Separator className="bg-white/5 my-4" />

        {/* Channels Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-400" />
              <Title text="Channels" />
            </div>
            <CreateChannel />
          </div>
          <div className="space-y-1">
            <ContactList contacts={channels} isChannel={true} />
          </div>
        </div>
      </ScrollArea>

      {/* Profile Info at Bottom */}
      <div className="mt-auto">
        <Separator className="bg-white/5" />
        <ProfileInfo />
      </div>
    </div>
  );
}

export default ContactsContainer;

export const Logo = () => {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center glow-sm">
        <Sparkles className="h-5 w-5 text-white" />
      </div>
      <div>
        <span className="text-xl font-bold text-white">Syncronus</span>
        <p className="text-xs text-gray-500">Stay connected</p>
      </div>
    </div>
  );
};

const Title = ({ text }) => {
  return (
    <h6 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
      {text}
    </h6>
  );
};
