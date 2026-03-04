import React, { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Player } from '@lottiefiles/react-lottie-player';
import { animationJson, getColor } from '@/lib/utils.js';
import apiClient from '@/lib/api-client';
import { SEARCH_CONTACTS_ROUTES, GET_MY_CONTACTS_ROUTES, HOST } from '@/utils/constants';
import { useAppStore } from '@/store';
import { Plus, Search, MessageCircle, UserPlus } from 'lucide-react';

function NewDm() {
  const { setSelectedChatType, setSelectedChatData, myContacts, setMyContacts, contactsLoaded } = useAppStore();
  const [openNewContactModel, setOpenNewContactModel] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Load contacts when dialog opens if not already loaded
  useEffect(() => {
    if (openNewContactModel && !contactsLoaded) {
      loadContacts();
    } else if (openNewContactModel && contactsLoaded) {
      setFilteredContacts(myContacts);
    }
  }, [openNewContactModel, contactsLoaded, myContacts]);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(GET_MY_CONTACTS_ROUTES, { withCredentials: true });
      if (response.data.contacts) {
        setMyContacts(response.data.contacts);
        setFilteredContacts(response.data.contacts);
      }
    } catch (error) {
      console.error("Failed to load contacts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchContacts = async (term) => {
    setSearchTerm(term);
    
    if (term.length === 0) {
      setFilteredContacts(myContacts);
      return;
    }

    // First filter locally for fast response
    const localFiltered = myContacts.filter(contact => {
      const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase();
      const email = (contact.email || '').toLowerCase();
      const searchLower = term.toLowerCase();
      return fullName.includes(searchLower) || email.includes(searchLower);
    });
    setFilteredContacts(localFiltered);

    // Also search from server for more accurate results
    try {
      if (term.length > 0) {
        const response = await apiClient.post(
          SEARCH_CONTACTS_ROUTES,
          { searchTerm: term },
          { withCredentials: true },
        );
        if (response.status === 200 && response.data.contacts) {
          setFilteredContacts(response.data.contacts);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const selectNewContact = (contact) => {
    setOpenNewContactModel(false);
    setSelectedChatType("contact");
    setSelectedChatData(contact);
    setSearchTerm("");
    setFilteredContacts(myContacts);
  };

  const handleClose = () => {
    setOpenNewContactModel(false);
    setSearchTerm("");
    setFilteredContacts(myContacts);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-gray-400 hover:text-violet-400 hover:bg-violet-500/10"
              onClick={() => setOpenNewContactModel(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-[#1a1a24] border-white/10">
            New Message
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={openNewContactModel} onOpenChange={handleClose}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-violet-400" />
              New Message
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Start a conversation with one of your contacts
            </DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <div className="px-6 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search your contacts..."
                className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl"
                value={searchTerm}
                onChange={(e) => searchContacts(e.target.value)}
              />
            </div>
          </div>

          {/* Results */}
          <div className="min-h-[280px] max-h-[350px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-[280px]">
                <div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full" />
              </div>
            ) : filteredContacts.length > 0 ? (
              <ScrollArea className="h-[280px] px-3">
                <div className="space-y-1 pb-4">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact._id}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors group"
                      onClick={() => selectNewContact(contact)}
                    >
                      <Avatar className="h-11 w-11 rounded-xl ring-2 ring-transparent group-hover:ring-violet-500/20 transition-all">
                        {contact.image ? (
                          <AvatarImage
                            src={`${HOST}/${contact.image}`}
                            alt={contact.firstName || contact.email}
                            className="object-cover"
                          />
                        ) : (
                          <AvatarFallback className={`${getColor(contact.color)} text-sm font-medium`}>
                            {contact.firstName
                              ? contact.firstName[0].toUpperCase()
                              : contact.email[0].toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">
                          {contact.firstName && contact.lastName
                            ? `${contact.firstName} ${contact.lastName}`
                            : contact.email}
                        </p>
                        {contact.firstName && (
                          <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                        )}
                      </div>
                    </div>
                  ))}
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
                    {searchTerm ? "No contacts found" : "No contacts yet"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {searchTerm
                      ? "Try a different search term"
                      : "Add contacts to start messaging"}
                  </p>
                </div>
                {!searchTerm && (
                  <Button
                    variant="outline"
                    className="mt-4 border-green-500/30 text-green-400 hover:bg-green-500/10"
                    onClick={() => {
                      handleClose();
                      // Will be replaced by opening add contact dialog
                      // For now, emit an event or use a callback
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default NewDm;
