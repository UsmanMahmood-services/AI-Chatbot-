import Chat from "./components/Chat";

export default function Home() {
  const username = "You"; 
  return (
    <main className="p-6 text-white bg-black h-lvh">
      <h1 className="text-2xl font-bold mb-4 flex gap-2">
        <img className="bg-white w-7" src="./fav.svg" />
        AI Chatbot
      </h1>
      <Chat username={username} />
    </main>
  );
}
