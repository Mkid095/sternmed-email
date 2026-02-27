export interface Email {
  id: string;
  subject: string;
  sender: string;
  recipient: string;
  date: string;
  body: string;
  read: boolean;
  folder: 'inbox' | 'sent' | 'archive' | string;
  isFavorite: boolean;
}

export type ViewType = 'inbox' | 'sent' | 'favorites' | 'settings' | string;
