const MessageBoxLoading = () => {
  return (
    <div className="flex w-full justify-start items-start gap-1.5 sm:gap-2">
      <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full bg-transparent flex items-center justify-center">
        <img
          src="/ask_logo_black_alpha.png"
          alt="Assistant"
          className="w-full h-full object-contain dark:hidden"
        />
        <img
          src="/ask_logo_white_alpha.png"
          alt="Assistant"
          className="w-full h-full object-contain hidden dark:block"
        />
      </div>
      <div className="flex flex-col space-y-1 sm:space-y-1.5 md:space-y-2 max-w-[92%] sm:max-w-[88%] md:max-w-[85%] lg:max-w-[80%]">
        <div className="rounded-2xl px-2 sm:px-3 md:px-4 py-2">
          <div className="flex space-x-1.5 sm:space-x-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce" />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBoxLoading;
