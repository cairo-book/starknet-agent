import EmptyChatMessageInput from './EmptyChatMessageInput';

const EmptyChat = ({
  sendMessage,
}: {
  sendMessage: (message: string) => void;
}) => {
  return (
    <div className="relative">
      <div className="flex flex-col items-center justify-center min-h-screen max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-4 space-y-6 sm:space-y-8">
        <div className="flex flex-col items-center justify-center space-y-2 mb-6 sm:mb-10">
          <h2 className="text-black/70 dark:text-white/100 text-2xl sm:text-3xl md:text-4xl font-medium text-center px-2">
            Unlock your Starknet expertise.
          </h2>
        </div>
        <EmptyChatMessageInput sendMessage={sendMessage} />
      </div>
    </div>
  );
};

export default EmptyChat;
