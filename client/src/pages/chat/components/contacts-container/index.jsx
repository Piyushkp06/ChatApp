import React, { useEffect } from 'react';
import ProfileInfo from './components/profile-info';
import NewDm from './components/new-dm';
import AddContact from './components/add-contact';
import apiClient from '@/lib/api-client';
import { GET_DM_CONTACTS_ROUTES, GET_USER_CHANNELS_ROUTE, GET_UNREAD_COUNTS_ROUTE, GET_MY_CONTACTS_ROUTES } from '@/utils/constants';
import { useAppStore } from '@/store';
import ContactList from '@/components/contact-list';
import CreateChannel from './components/create-channel';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Users, Sparkles, UserPlus, BookUser } from 'lucide-react';
import { HOST } from '@/utils/constants';
import { getColor } from '@/lib/utils';

function ContactsContainer() {
  const { 
    setDirectMessagesContacts, 
    directMessagesContacts, 
    channels, 
    setChannels,
    setUnreadCounts,
    setTotalUnread,
    totalUnread,
    setMyContacts,
    myContacts,
    contactsLoaded,
    setSelectedChatType,
    setSelectedChatData
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

    // Load user's contacts list
    const getMyContacts = async () => {
      try {
        const response = await apiClient.get(GET_MY_CONTACTS_ROUTES, {
          withCredentials: true,
        });
        if (response.data.contacts) {
          setMyContacts(response.data.contacts);
        }
      } catch (error) {
        console.error("Failed to fetch contacts:", error);
      }
    };
    
    getChannels();
    getContacts();
    getUnreadCounts();
    if (!contactsLoaded) {
      getMyContacts();
    }
  }, [setChannels, setDirectMessagesContacts, setUnreadCounts, setTotalUnread, setMyContacts, contactsLoaded]);

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
            <div className="flex items-center gap-1">
              <AddContact />
              <NewDm />
            </div>
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

        <Separator className="bg-white/5 my-4" />

        {/* My Contacts Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 mb-3">
            <div className="flex items-center gap-2">
              <BookUser className="h-4 w-4 text-green-400" />
              <Title text="My Contacts" />
              {myContacts.length > 0 && (
                <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 bg-green-600/20 text-green-400 text-xs rounded-full">
                  {myContacts.length}
                </Badge>
              )}
            </div>
            <AddContact />
          </div>
          <div className="space-y-1">
            {myContacts.length > 0 ? (
              myContacts.slice(0, 5).map((contact) => (
                <div
                  key={contact._id}
                  className="group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-white/5 transition-all duration-200"
                  onClick={() => {
                    setSelectedChatType("contact");
                    setSelectedChatData(contact);
                  }}
                >
                  <Avatar className="h-8 w-8 rounded-lg shrink-0">
                    {contact.image ? (
                      <AvatarImage
                        src={`${HOST}/${contact.image}`}
                        alt={contact.firstName || contact.email}
                        className="object-cover"
                      />
                    ) : (
                      <AvatarFallback className={`${getColor(contact.color)} text-xs font-medium`}>
                        {contact.firstName
                          ? contact.firstName[0].toUpperCase()
                          : contact.email[0].toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="text-sm text-gray-300 group-hover:text-white truncate">
                    {contact.firstName && contact.lastName
                      ? `${contact.firstName} ${contact.lastName}`
                      : contact.email}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-gray-500">No contacts yet</p>
                <p className="text-xs text-gray-600 mt-1">Click + to add contacts</p>
              </div>
            )}
            {myContacts.length > 5 && (
              <div className="px-3 py-2">
                <p className="text-xs text-violet-400 cursor-pointer hover:text-violet-300">
                  +{myContacts.length - 5} more contacts
                </p>
              </div>
            )}
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
