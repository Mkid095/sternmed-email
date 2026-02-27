import React, { useState } from 'react';
import { 
  Inbox, 
  Send, 
  Star, 
  Settings, 
  Menu, 
  Plus, 
  Search, 
  ChevronLeft,
  Folder,
  X,
  Mail,
  User,
  Clock
} from 'lucide-react';
import { Email, ViewType } from './types';
import { mockEmails } from './data';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmails = mockEmails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          email.sender.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (currentView === 'inbox') return email.folder === 'inbox';
    if (currentView === 'sent') return email.folder === 'sent';
    if (currentView === 'favorites') return email.isFavorite;
    return email.folder === currentView;
  });

  const NavItem = ({ icon, label, view, currentView, onClick }: any) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${currentView === view ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const MobileMenuItem = ({ icon, label, onClick }: any) => (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  const renderSidebar = () => (
    <div className="hidden md:flex flex-col w-64 bg-gray-50 border-r border-gray-200 h-screen">
      <div className="p-6">
        <h1 className="text-xl font-bold text-primary tracking-tight">Sternmed Afrika</h1>
      </div>
      
      <div className="px-4 pb-4">
        <button 
          onClick={() => setIsComposeOpen(true)}
          className="w-full bg-primary hover:bg-primary-hover text-white rounded-md py-2 px-4 flex items-center justify-center gap-2 transition-colors font-medium"
        >
          <Plus size={20} />
          Compose
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <NavItem icon={<Inbox size={20} />} label="Inbox" view="inbox" currentView={currentView} onClick={() => { setCurrentView('inbox'); setSelectedEmail(null); }} />
        <NavItem icon={<Send size={20} />} label="Sent" view="sent" currentView={currentView} onClick={() => { setCurrentView('sent'); setSelectedEmail(null); }} />
        <NavItem icon={<Star size={20} />} label="Favorites" view="favorites" currentView={currentView} onClick={() => { setCurrentView('favorites'); setSelectedEmail(null); }} />
        
        <div className="pt-4 pb-2">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Folders</p>
        </div>
        <NavItem icon={<Folder size={20} />} label="Projects" view="projects" currentView={currentView} onClick={() => { setCurrentView('projects'); setSelectedEmail(null); }} />
        <NavItem icon={<Folder size={20} />} label="Invoices" view="invoices" currentView={currentView} onClick={() => { setCurrentView('invoices'); setSelectedEmail(null); }} />
      </nav>

      <div className="p-4 border-t border-gray-200">
        <NavItem icon={<Settings size={20} />} label="Settings" view="settings" currentView={currentView} onClick={() => { setCurrentView('settings'); setSelectedEmail(null); }} />
      </div>
    </div>
  );

  const renderMobileBottomNav = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 px-4 z-40">
      <button 
        onClick={() => { setCurrentView('inbox'); setSelectedEmail(null); setIsMobileMenuOpen(false); }}
        className={`flex flex-col items-center justify-center w-16 h-full ${currentView === 'inbox' ? 'text-primary' : 'text-gray-500'}`}
      >
        <Inbox size={24} />
        <span className="text-[10px] mt-1 font-medium">Inbox</span>
      </button>

      <div className="relative -top-5">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-primary text-white p-4 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-hover transition-colors"
        >
          <Menu size={28} />
        </button>
      </div>

      <button 
        onClick={() => { setCurrentView('settings'); setSelectedEmail(null); setIsMobileMenuOpen(false); }}
        className={`flex flex-col items-center justify-center w-16 h-full ${currentView === 'settings' ? 'text-primary' : 'text-gray-500'}`}
      >
        <Settings size={24} />
        <span className="text-[10px] mt-1 font-medium">Settings</span>
      </button>
    </div>
  );

  const renderMobileMenu = () => (
    <div className={`md:hidden fixed inset-0 z-30 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
      <div className={`absolute bottom-20 left-4 right-4 bg-white rounded-xl shadow-xl transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-y-0' : 'translate-y-8'}`}>
        <div className="p-4 space-y-2">
          <button 
            onClick={() => { setIsComposeOpen(true); setIsMobileMenuOpen(false); }}
            className="w-full bg-primary text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 font-medium mb-4"
          >
            <Plus size={20} />
            Compose New Email
          </button>
          <MobileMenuItem icon={<Send size={20} />} label="Sent Emails" onClick={() => { setCurrentView('sent'); setSelectedEmail(null); setIsMobileMenuOpen(false); }} />
          <MobileMenuItem icon={<Star size={20} />} label="Favorites" onClick={() => { setCurrentView('favorites'); setSelectedEmail(null); setIsMobileMenuOpen(false); }} />
          <div className="h-px bg-gray-100 my-2" />
          <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Folders</p>
          <MobileMenuItem icon={<Folder size={20} />} label="Projects" onClick={() => { setCurrentView('projects'); setSelectedEmail(null); setIsMobileMenuOpen(false); }} />
          <MobileMenuItem icon={<Folder size={20} />} label="Invoices" onClick={() => { setCurrentView('invoices'); setSelectedEmail(null); setIsMobileMenuOpen(false); }} />
        </div>
      </div>
    </div>
  );

  const renderEmailList = () => (
    <div className={`flex-1 flex flex-col h-full ${selectedEmail ? 'hidden md:flex md:w-1/3 md:border-r md:border-gray-200' : 'flex'}`}>
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <h2 className="text-2xl font-bold text-gray-800 capitalize mb-4">
          {currentView}
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search emails..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
            <Mail size={48} className="mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">No emails found</p>
            <p className="text-sm mt-1">Your {currentView} is empty.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredEmails.map(email => (
              <div 
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedEmail?.id === email.id ? 'bg-blue-50/50' : ''} ${!email.read ? 'bg-white' : 'bg-gray-50/30'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-medium truncate pr-2 ${!email.read ? 'text-gray-900' : 'text-gray-600'}`}>
                    {currentView === 'sent' ? email.recipient : email.sender}
                  </span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(email.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm truncate font-medium ${!email.read ? 'text-gray-800' : 'text-gray-600'}`}>
                    {email.subject}
                  </span>
                  {email.isFavorite && <Star size={14} className="text-yellow-400 fill-current flex-shrink-0" />}
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 leading-snug">
                  {email.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderEmailDetail = () => {
    if (!selectedEmail) {
      return (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gray-50 text-gray-400">
          <Mail size={64} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">Select an email to read</p>
        </div>
      );
    }

    return (
      <div className={`flex-1 flex flex-col h-full bg-white ${!selectedEmail ? 'hidden' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200 flex items-center gap-4 sticky top-0 bg-white z-10">
          <button 
            onClick={() => setSelectedEmail(null)}
            className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 line-clamp-1">{selectedEmail.subject}</h2>
            <button className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-100 rounded-full transition-colors">
              <Star size={20} className={selectedEmail.isFavorite ? "text-yellow-400 fill-current" : ""} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                {selectedEmail.sender.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedEmail.sender}</p>
                <p className="text-sm text-gray-500">to {selectedEmail.recipient}</p>
              </div>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Clock size={14} />
              {new Date(selectedEmail.date).toLocaleString()}
            </div>
          </div>
          
          <div className="prose max-w-none text-gray-800 whitespace-pre-wrap">
            {selectedEmail.body}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors">
            Reply
          </button>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="flex-1 flex flex-col h-full bg-white overflow-y-auto p-6 md:p-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Settings</h2>
      
      <div className="max-w-2xl space-y-8">
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">Account</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User size={24} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Sternmed Admin</p>
                  <p className="text-sm text-gray-500">admin@sternmed-afrika.com</p>
                </div>
              </div>
              <button className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors">
                Edit
              </button>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">Preferences</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md cursor-pointer transition-colors">
              <div>
                <p className="font-medium text-gray-800">Desktop Notifications</p>
                <p className="text-sm text-gray-500">Receive alerts for new emails</p>
              </div>
              <input type="checkbox" className="w-5 h-5 text-primary rounded focus:ring-primary" defaultChecked />
            </label>
            <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md cursor-pointer transition-colors">
              <div>
                <p className="font-medium text-gray-800">Compact View</p>
                <p className="text-sm text-gray-500">Show more emails on screen</p>
              </div>
              <input type="checkbox" className="w-5 h-5 text-primary rounded focus:ring-primary" />
            </label>
          </div>
        </section>
        
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">Outbound Server (Resend)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input type="password" value="••••••••••••••••" readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default From Address</label>
              <input type="text" defaultValue="noreply@sternmed-afrika.com" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <button className="px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition-colors">
              Save Changes
            </button>
          </div>
        </section>
      </div>
    </div>
  );

  const renderComposeModal = () => {
    if (!isComposeOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 bg-black/50" onClick={() => setIsComposeOpen(false)} />
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800">New Message</h3>
            <button onClick={() => setIsComposeOpen(false)} className="text-gray-500 hover:text-gray-800 p-1 rounded-md hover:bg-gray-200 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <input type="text" placeholder="To" className="w-full px-0 py-2 border-b border-gray-200 focus:border-primary focus:ring-0 outline-none text-gray-900 placeholder-gray-400" />
            </div>
            <div>
              <input type="text" placeholder="Subject" className="w-full px-0 py-2 border-b border-gray-200 focus:border-primary focus:ring-0 outline-none text-gray-900 placeholder-gray-400 font-medium" />
            </div>
            <div className="flex-1 min-h-[200px]">
              <textarea 
                placeholder="Write your message here..." 
                className="w-full h-full min-h-[200px] px-0 py-2 border-none focus:ring-0 outline-none text-gray-800 resize-none"
              />
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <button onClick={() => setIsComposeOpen(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-md transition-colors">
              Discard
            </button>
            <button className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition-colors flex items-center gap-2">
              <Send size={16} />
              Send
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans text-gray-900">
      {renderSidebar()}
      
      <main className="flex-1 flex overflow-hidden pb-16 md:pb-0 relative">
        {currentView === 'settings' ? (
          renderSettings()
        ) : (
          <>
            {renderEmailList()}
            {renderEmailDetail()}
          </>
        )}
      </main>

      {renderMobileBottomNav()}
      {renderMobileMenu()}
      {renderComposeModal()}
    </div>
  );
}
