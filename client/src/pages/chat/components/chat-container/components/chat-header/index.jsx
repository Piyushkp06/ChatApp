import React from 'react';
import { useAppStore } from '@/store';
import { RiCloseFill } from 'react-icons/ri';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { HOST } from '@/utils/constants';
import { getColor } from '@/lib/utils';

function ChatHeader() {
  const { closeChat, selectedChatData, selectedChatType } = useAppStore();

  return (
    <div className="h-[10vh] border-b-2 border-[#2f303b] flex items-center justify-between px-10">
      <div className="flex gap-2 items-center w-full justify-between">
        <div className="flex gap-3 items-center justify-center">
          <div className="w-12 h-12 relative">
            {selectedChatType === 'contact' ? (
              <Avatar className="h-12 w-12 rounded-full overflow-hidden">
                {selectedChatData.image ? (
                  <AvatarImage
                    src={`${HOST}/${selectedChatData.image}`}
                    alt="profile"
                    className="object-cover w-full h-full bg-black"
                  />
                ) : (
                  <div
                    className={`uppercase h-12 w-12 text-lg border-[1px] flex items-center justify-center rounded-full ${getColor(
                      selectedChatData.color
                    )}`}
                  >
                    {selectedChatData.firstName
                      ? selectedChatData.firstName[0]
                      : selectedChatData.email[0]}
                  </div>
                )}
              </Avatar>
            ) : (
              <div className="bg-[#ffffff22] h-12 w-12 flex items-center justify-center rounded-full">
                {selectedChatData.name[0]}
              </div>
            )}
          </div>
          <div>
            {selectedChatType === 'channel' && selectedChatData.name}
            {selectedChatType === 'contact' &&
              (selectedChatData.firstName
                ? `${selectedChatData.firstName} ${selectedChatData.lastName}`
                : selectedChatData.email)}
          </div>
        </div>
        {selectedChatType === 'channel' && (
  <div className="text-neutral-400 text-sm flex items-center gap-2">
    <span className="font-semibold">Members:</span>

    {selectedChatData.members?.length > 0 ? (
      <div className="flex gap-1">
        <div className="text-indigo-100">
          {selectedChatData.members.map((member) =>
              member.firstName
                ? `${member.firstName} ${member.lastName || ''}`
                : member.email
            )
            .join(', ')
        }
        </div>
      </div>
    ) : (
      <span className="italic">No members found</span>
    )}
  </div> 
)}

        <div className="flex items-center justify-center gap-5">
          <button
            className="text-neutral-500 focus:border-none focus:outline-none focus:text-white duration-300 transition-all"
            onClick={closeChat}
          >
            <RiCloseFill className="text-3xl" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatHeader;
