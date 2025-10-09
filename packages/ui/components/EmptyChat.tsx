import EmptyChatMessageInput from './EmptyChatMessageInput';

const EmptyChat = ({
  sendMessage,
}: {
  sendMessage: (message: string) => void;
}) => {
  return (
    <div className="relative">
      <div className="flex flex-col items-center justify-center min-h-screen max-w-screen-sm mx-auto p-2 space-y-8">
        <div className="flex flex-col items-center justify-center space-y-2 mb-10">
          <p className="-mt-8">Welcome to the Starknet Agent</p>
          <h2 className="text-black/70 dark:text-white/100 text-3xl font-medium text-center">
            Unlock your Starknet expertise.
          </h2>
        </div>
        <EmptyChatMessageInput sendMessage={sendMessage} />
      </div>
    </div>
  );
};

export default EmptyChat;
