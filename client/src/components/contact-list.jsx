import { useAppStore } from "@/store";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { HOST } from "@/utils/constants";
import { getColor } from "@/lib/utils";
import { Hash, Check } from "lucide-react";

const ContactList = ({ contacts, isChannel = false }) => {
  const {
    selectedChatData,
    setSelectedChatData,
    setSelectedChatType,
    setSelectedChatMessages,
  } = useAppStore();

  const handleClick = (contact) => {
    if (isChannel) setSelectedChatType("channel");
    else setSelectedChatType("contact");

    setSelectedChatData(contact);

    if (selectedChatData && selectedChatData._id !== contact._id) {
      setSelectedChatMessages([]);
    }
  };

  if (!contacts || contacts.length === 0) {
    return (
      <div className="px-2 py-4 text-center">
        <p className="text-sm text-gray-500">
          {isChannel ? "No channels yet" : "No conversations yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {contacts.map((contact) => {
        const isSelected = selectedChatData && selectedChatData._id === contact._id;
        
        return (
          <div
            key={contact._id}
            className={`
              group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
              transition-all duration-200 ease-out
              ${isSelected 
                ? "bg-violet-600/20 border border-violet-500/30" 
                : "hover:bg-white/5 border border-transparent"
              }
            `}
            onClick={() => handleClick(contact)}
          >
            {/* Avatar */}
            {isChannel ? (
              <div className={`
                h-10 w-10 rounded-xl flex items-center justify-center shrink-0
                ${isSelected 
                  ? "bg-violet-600 text-white" 
                  : "bg-white/10 text-gray-400 group-hover:bg-violet-600/20 group-hover:text-violet-400"
                }
                transition-all duration-200
              `}>
                <Hash className="h-5 w-5" />
              </div>
            ) : (
              <Avatar className="h-10 w-10 rounded-xl shrink-0 ring-2 ring-transparent group-hover:ring-violet-500/20 transition-all">
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
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`
                  text-sm font-medium truncate
                  ${isSelected ? "text-white" : "text-gray-200 group-hover:text-white"}
                  transition-colors
                `}>
                  {isChannel 
                    ? contact.name 
                    : (contact.firstName 
                        ? `${contact.firstName} ${contact.lastName || ""}`.trim()
                        : contact.email
                      )
                  }
                </span>
                {isSelected && (
                  <Check className="h-4 w-4 text-violet-400 shrink-0" />
                )}
              </div>
              {!isChannel && contact.email && contact.firstName && (
                <p className="text-xs text-gray-500 truncate">{contact.email}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ContactList;
