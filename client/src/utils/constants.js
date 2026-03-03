export const HOST=import.meta.env.VITE_SERVER_URL;
export const AI_HOST=import.meta.env.VITE_AI_SERVER_URL || "http://localhost:8000";

export const AUTH_ROUTES="api/auth";
export const SIGNUP_ROUTE= `${AUTH_ROUTES}/signup`;
export const LOGIN_ROUTE= `${AUTH_ROUTES}/login`;
export const GET_USER_INFO= `${AUTH_ROUTES}/user-info`;
export const UPDATE_PROFILE_ROUTE=`${AUTH_ROUTES}/update-profile`;
export const ADD_PROFILE_IMAGE_ROUTE=`${AUTH_ROUTES}/add-profile-image`;
export const REMOVE_PROFILE_IMAGE_ROUTE=`${AUTH_ROUTES}/remove-profile-image`;
export const LOGOUT_ROUTE=`${AUTH_ROUTES}/logout`;


export const CONTACTS_ROUTES="api/contacts";
export const SEARCH_CONTACTS_ROUTES=`${CONTACTS_ROUTES}/search`;
export const GET_DM_CONTACTS_ROUTES=`${CONTACTS_ROUTES}/get-contacts-for-dm`;
export const GET_ALL_CONTACTS_ROUTES=`${CONTACTS_ROUTES}/get-all-contacts`;

export const MESSAGES_ROUTES="api/messages";
export const GET_ALL_MESSAGES_ROUTE=`${MESSAGES_ROUTES}/get-messages`;
export const UPLOAD_FILE_ROUTE=`${MESSAGES_ROUTES}/upload-file`;
export const GET_UNREAD_COUNTS_ROUTE=`${MESSAGES_ROUTES}/unread-counts`;
export const MARK_AS_READ_ROUTE=`${MESSAGES_ROUTES}/mark-as-read`;
export const GET_USER_STATUS_ROUTE=`${MESSAGES_ROUTES}/user-status`;

export const CHANNEL_ROUTES="api/channel";
export const CREATE_CHANNEL_ROUTE=`${CHANNEL_ROUTES}/create-channel`;
export const GET_USER_CHANNELS_ROUTE=`${CHANNEL_ROUTES}/get-user-channels`;
export const GET_CHANNEL_MESSAGES_ROUTE=`${CHANNEL_ROUTES}/get-channel-messages`;

// Encryption Routes
export const ENCRYPTION_ROUTES="api/encryption";
export const UPDATE_PUBLIC_KEY_ROUTE=`${ENCRYPTION_ROUTES}/update-public-key`;
export const GET_MY_PUBLIC_KEY_ROUTE=`${ENCRYPTION_ROUTES}/my-public-key`;
export const GET_PUBLIC_KEY_ROUTE=`${ENCRYPTION_ROUTES}/public-key`;
export const GET_PUBLIC_KEYS_ROUTE=`${ENCRYPTION_ROUTES}/public-keys`;

// AI Routes (Python Backend)
export const AI_ROUTES="api/ai";
export const GET_AI_RESPONSE_ROUTE=`${AI_HOST}/${AI_ROUTES}/generate`;
export const SUMMARIZE_CHAT_ROUTE=`${AI_HOST}/${AI_ROUTES}/summarize`;

