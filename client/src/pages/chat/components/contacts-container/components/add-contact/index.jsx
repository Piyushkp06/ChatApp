import React, { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Player } from '@lottiefiles/react-lottie-player';
import { animationJson, getColor } from '@/lib/utils.js';
import apiClient from '@/lib/api-client';
import { 
  SEARCH_USERS_ROUTES, 
  ADD_CONTACT_ROUTE,
  GET_MY_CONTACTS_ROUTES,
  REMOVE_CONTACT_ROUTE,
  HOST 
} from '@/utils/constants';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Search, 
  Users, 
  Check, 
  Clock, 
  UserMinus, 
  Loader2 
} from 'lucide-react';

function AddContact() {
  const { myContacts, setMyContacts, addMyContact, removeMyContact } = useAppStore();
  const [openModal, setOpenModal] = useState(false);
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [loadingActions, setLoadingActions] = useState({});
  const [activeTab, setActiveTab] = useState("search");

  const searchUsers = async (term) => {
    setSearchTerm(term);
    if (term.length === 0) {
      setSearchedUsers([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await apiClient.post(
        SEARCH_USERS_ROUTES,
        { searchTerm: term },
        { withCredentials: true },
      );
      if (response.status === 200 && response.data.users) {
        setSearchedUsers(response.data.users);
      } else {
        setSearchedUsers([]);
      }
    } catch (error) {
      console.log(error);
      setSearchedUsers([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddContact = async (user) => {
    setLoadingActions(prev => ({ ...prev, [user._id]: true }));
    try {
      const response = await apiClient.post(
        ADD_CONTACT_ROUTE,
        { contactId: user._id },
        { withCredentials: true }
      );
      
      if (response.status === 201) {
        toast.success("Contact added successfully!");
        addMyContact(response.data.contact);
        // Update the searched users list to reflect the change
        setSearchedUsers(prev => prev.map(u => 
          u._id === user._id ? { ...u, isContact: true, contactStatus: "accepted" } : u
        ));
      }
    } catch (error) {
      const message = error.response?.data?.message || "Failed to add contact";
      toast.error(message);
    } finally {
      setLoadingActions(prev => ({ ...prev, [user._id]: false }));
    }
  };

  const handleRemoveContact = async (contactId) => {
    setLoadingActions(prev => ({ ...prev, [contactId]: true }));
    try {
      const response = await apiClient.post(
        REMOVE_CONTACT_ROUTE,
        { contactId },
        { withCredentials: true }
      );
      
      if (response.status === 200) {
        toast.success("Contact removed successfully!");
        removeMyContact(contactId);
        // Update searched users if they're in view
        setSearchedUsers(prev => prev.map(u => 
          u._id === contactId ? { ...u, isContact: false, contactStatus: null } : u
        ));
      }
    } catch (error) {
      const message = error.response?.data?.message || "Failed to remove contact";
      toast.error(message);
    } finally {
      setLoadingActions(prev => ({ ...prev, [contactId]: false }));
    }
  };

  const loadMyContacts = async () => {
    try {
      const response = await apiClient.get(GET_MY_CONTACTS_ROUTES, { withCredentials: true });
      if (response.data.contacts) {
        setMyContacts(response.data.contacts);
      }
    } catch (error) {
      console.error("Failed to load contacts:", error);
    }
  };

  const handleOpenChange = (open) => {
    setOpenModal(open);
    if (open) {
      loadMyContacts();
    } else {
      setSearchTerm("");
      setSearchedUsers([]);
      setActiveTab("search");
    }
  };

  const renderUserItem = (user, showRemove = false) => {
    const isLoading = loadingActions[user._id];
    const isContact = user.isContact || showRemove;
    
    return (
      <div
        key={user._id}
        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
      >
        <Avatar className="h-11 w-11 rounded-xl ring-2 ring-transparent group-hover:ring-violet-500/20 transition-all">
          {user.image ? (
            <AvatarImage
              src={`${HOST}/${user.image}`}
              alt={user.firstName || user.email}
              className="object-cover"
            />
          ) : (
            <AvatarFallback className={`${getColor(user.color)} text-sm font-medium`}>
              {user.firstName
                ? user.firstName[0].toUpperCase()
                : user.email[0].toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.email}
          </p>
          {user.firstName && (
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          )}
        </div>
        
        {/* Action button */}
        <div className="shrink-0">
          {isLoading ? (
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="h-8 px-3 rounded-lg"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : isContact ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveContact(user._id)}
              className="h-8 px-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <UserMinus className="h-4 w-4 mr-1" />
              Remove
            </Button>
          ) : user.isPending ? (
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="h-8 px-3 rounded-lg text-yellow-400"
            >
              <Clock className="h-4 w-4 mr-1" />
              Pending
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddContact(user)}
              className="h-8 px-3 rounded-lg text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-gray-400 hover:text-green-400 hover:bg-green-500/10"
              onClick={() => setOpenModal(true)}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-[#1a1a24] border-white/10">
            Add Contact
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={openModal} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-400" />
              Contacts
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Add new contacts or manage your existing ones
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full px-6 bg-transparent border-b border-white/10 rounded-none h-auto p-0 gap-4">
              <TabsTrigger 
                value="search" 
                className="px-1 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:bg-transparent bg-transparent text-gray-400 data-[state=active]:text-white"
              >
                <Search className="h-4 w-4 mr-2" />
                Find People
              </TabsTrigger>
              <TabsTrigger 
                value="contacts" 
                className="px-1 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:bg-transparent bg-transparent text-gray-400 data-[state=active]:text-white"
              >
                <Users className="h-4 w-4 mr-2" />
                My Contacts ({myContacts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-0">
              {/* Search Input */}
              <div className="px-6 py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl"
                    value={searchTerm}
                    onChange={(e) => searchUsers(e.target.value)}
                  />
                </div>
              </div>

              {/* Search Results */}
              <div className="min-h-[280px] max-h-[350px]">
                {isSearching ? (
                  <div className="flex items-center justify-center h-[280px]">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                  </div>
                ) : searchedUsers.length > 0 ? (
                  <ScrollArea className="h-[280px] px-3">
                    <div className="space-y-1 pb-4">
                      {searchedUsers.map((user) => renderUserItem(user))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[280px] px-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-violet-500/10 rounded-full blur-xl" />
                      <Player
                        autoplay
                        loop
                        src={animationJson}
                        style={{ height: 100, width: 100 }}
                        className="relative"
                      />
                    </div>
                    <div className="text-center mt-4 space-y-1">
                      <h3 className="text-lg font-medium text-white">
                        {searchTerm ? "No users found" : "Find people to add"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {searchTerm
                          ? "Try a different search term"
                          : "Search by name or email to add contacts"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="mt-0">
              {/* My Contacts List */}
              <div className="min-h-[340px] max-h-[400px]">
                {myContacts.length > 0 ? (
                  <ScrollArea className="h-[340px] px-3 pt-4">
                    <div className="space-y-1 pb-4">
                      {myContacts.map((contact) => renderUserItem(contact, true))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[340px] px-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-violet-500/10 rounded-full blur-xl" />
                      <Users className="h-16 w-16 text-gray-500 relative" />
                    </div>
                    <div className="text-center mt-4 space-y-1">
                      <h3 className="text-lg font-medium text-white">No contacts yet</h3>
                      <p className="text-sm text-gray-500">
                        Search and add people to your contacts
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-4 border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                      onClick={() => setActiveTab("search")}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Find People
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AddContact;
