import { Hero } from "@/components/hero/Hero";
import { History } from "@/components/sections/History";
import { Juro } from "@/components/juro/Juro";
import { JoinCommunity } from "@/components/sections/JoinCommunity";
import { getTeam } from "@/lib/content/queries";

export default async function HomePage() {
  const { members } = await getTeam();
  return (
    <>
      <Hero />
      <History />
      <JoinCommunity members={members.filter((m) => m.kind === "executive")} />
      <Juro />
    </>
  );
}
