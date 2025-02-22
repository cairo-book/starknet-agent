import { Delete, Trash } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { toast } from 'sonner';
import { Chat } from '@/app/library/page';
import { StoredChat } from './ChatWindow';

const deleteChatFromLocalStorage = (chatId: string) => {
  const existingChats = JSON.parse(
    localStorage.getItem('chats') || '[]',
  ) as StoredChat[];
  const newChats = existingChats.filter((chat) => chat.id !== chatId);
  localStorage.setItem('chats', JSON.stringify(newChats));
};

const DeleteChat = ({
  chatId,
  chats,
  setChats,
}: {
  chatId: string;
  chats: Chat[];
  setChats: (chats: Chat[]) => void;
}) => {
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    deleteChatFromLocalStorage(chatId);
    const newChats = chats.filter((chat) => chat.id !== chatId);
    setChats(newChats);
    setConfirmationDialogOpen(false);
    setLoading(false);
    return;
  };

  return (
    <>
      <button
        onClick={() => {
          setConfirmationDialogOpen(true);
        }}
        className="bg-transparent text-red-400 hover:scale-105 transition duration-200"
      >
        <Trash size={17} />
      </button>
      <Transition appear show={confirmationDialogOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => {
            if (!loading) {
              setConfirmationDialogOpen(false);
            }
          }}
        >
          <Dialog.Backdrop className="fixed inset-0 bg-black/30" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-100"
                leaveFrom="opacity-100 scale-200"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title className="text-lg font-medium leading-6 dark:text-white">
                    Delete Confirmation
                  </Dialog.Title>
                  <Dialog.Description className="text-sm dark:text-white/70 text-black/70">
                    Are you sure you want to delete this chat?
                  </Dialog.Description>
                  <div className="flex flex-row items-end justify-end space-x-4 mt-6">
                    <button
                      onClick={() => {
                        if (!loading) {
                          setConfirmationDialogOpen(false);
                        }
                      }}
                      className="text-black/50 dark:text-white/50 text-sm hover:text-black/70 hover:dark:text-white/70 transition duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="text-red-400 text-sm hover:text-red-500 transition duration200"
                    >
                      Delete
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default DeleteChat;
