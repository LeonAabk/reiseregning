import React, { createContext, useContext, useState } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface UIContextType {
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  confirm: (message: string) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string) => Promise<string | null>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    resolve: (val: boolean) => void;
  } | null>(null);

  const [promptDialog, setPromptDialog] = useState<{
    message: string;
    defaultValue: string;
    resolve: (val: string | null) => void;
  } | null>(null);

  const [promptValue, setPromptValue] = useState('');

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const confirm = (message: string): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmDialog({ message, resolve });
    });
  };

  const prompt = (message: string, defaultValue: string = ''): Promise<string | null> => {
    setPromptValue(defaultValue);
    return new Promise(resolve => {
      setPromptDialog({ message, defaultValue, resolve });
    });
  };

  return (
    <UIContext.Provider value={{ showToast, confirm, prompt }}>
      {children}

      {/* Toast notifications container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto px-5 py-3 rounded-md text-white text-sm font-medium shadow-lg transition-all duration-300 animate-slide-up ${
              t.type === 'error'
                ? 'bg-[#ef4444]'
                : t.type === 'success'
                ? 'bg-[#10b981]'
                : 'bg-[#1e293b]'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl text-center">
            <p className="text-gray-800 text-base mb-6 font-medium leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  confirmDialog.resolve(false);
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 font-medium transition cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.resolve(true);
                  setConfirmDialog(null);
                }}
                className="px-5 py-2 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-md font-medium transition cursor-pointer"
              >
                Ja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt modal */}
      {promptDialog && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
            <p className="text-gray-800 text-base mb-3 font-medium">
              {promptDialog.message}
            </p>
            <input
              type="text"
              autoFocus
              value={promptValue}
              onChange={e => setPromptValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  promptDialog.resolve(promptValue);
                  setPromptDialog(null);
                } else if (e.key === 'Escape') {
                  promptDialog.resolve(null);
                  setPromptDialog(null);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  promptDialog.resolve(null);
                  setPromptDialog(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 font-medium transition cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => {
                  promptDialog.resolve(promptValue);
                  setPromptDialog(null);
                }}
                className="px-5 py-2 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-md font-medium transition cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
};
