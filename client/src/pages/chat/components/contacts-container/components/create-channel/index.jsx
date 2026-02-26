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
import MultipleSelector from '@/components/ui/multiselect';
import apiClient from '@/lib/api-client';
import { GET_ALL_CONTACTS_ROUTES, CREATE_CHANNEL_ROUTE } from '@/utils/constants';
import { useAppStore } from '@/store';
import { Plus, Hash, Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

function CreateChannel() {
  const { addChannel } = useAppStore();
  const [newChannelModal, setNewChannelModal] = useState(false);
  const [allContacts, setAllContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [channelName, setChannelName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getData = async () => {
      try {
        const response = await apiClient.get(GET_ALL_CONTACTS_ROUTES, {
          withCredentials: true,
        });
        setAllContacts(response.data.contacts);
      } catch (error) {
        console.log(error);
      }
    };
    if (newChannelModal) {
      getData();
    }
  }, [newChannelModal]);

  const createChannel = async () => {
    if (!channelName.trim()) {
      toast.error("Channel name is required");
      return;
    }
    if (selectedContacts.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post(
        CREATE_CHANNEL_ROUTE,
        {
          name: channelName,
          members: selectedContacts.map((contact) => contact.value),
        },
        { withCredentials: true }
      );

      if (response.status === 201) {
        toast.success("Channel created successfully!");
        setChannelName("");
        setSelectedContacts([]);
        setNewChannelModal(false);
        addChannel(response.data.channel);
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to create channel");
    } finally {
      setIsLoading(false);
    }
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
              onClick={() => setNewChannelModal(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-[#1a1a24] border-white/10">
            Create Channel
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={newChannelModal} onOpenChange={setNewChannelModal}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <Hash className="h-4 w-4 text-white" />
              </div>
              Create Channel
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a group channel to chat with multiple people
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-5">
            {/* Channel Name */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Channel Name
              </label>
              <Input
                placeholder="e.g., Project Alpha"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl"
                onChange={(e) => setChannelName(e.target.value)}
                value={channelName}
              />
            </div>

            {/* Members Selection */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Add Members
              </label>
              <MultipleSelector
                className="rounded-xl bg-white/5 border-white/10 py-2 text-white hover:bg-white/[0.07] focus-within:border-violet-500"
                defaultOptions={allContacts}
                placeholder="Search contacts..."
                value={selectedContacts}
                onChange={setSelectedContacts}
                emptyIndicator={
                  <p className="text-center text-sm text-gray-500 py-4">
                    No contacts found
                  </p>
                }
              />
            </div>

            {/* Selected Count */}
            {selectedContacts.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <div className="h-2 w-2 rounded-full bg-violet-500" />
                <span className="text-sm text-gray-400">
                  {selectedContacts.length} member{selectedContacts.length > 1 ? 's' : ''} selected
                </span>
              </div>
            )}

            {/* Create Button */}
            <Button
              className="w-full h-11 gradient-primary hover:opacity-90 text-white font-semibold rounded-xl glow-sm transition-all duration-300"
              onClick={createChannel}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </div>
              ) : (
                "Create Channel"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CreateChannel;
