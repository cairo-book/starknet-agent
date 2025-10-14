import ChatWindow from '@/components/ChatWindow';
import Sidebar from '@/components/Sidebar';

export type paramsType = Promise<{ chatId: string }>;

const Page = async ({ params }: { params: paramsType }) => {
  const { chatId } = await params;
  return (
    <Sidebar>
      <ChatWindow id={chatId} />
    </Sidebar>
  );
};

export default Page;
