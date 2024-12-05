import {create} from 'zustand';

export const useAppStore = create((set) => ({
  userInfo: JSON.parse(localStorage.getItem('userInfo')) || null,
  setUserInfo: (info) => {
    localStorage.setItem('userInfo', JSON.stringify(info));
    set({ userInfo: info });
  },
}));
