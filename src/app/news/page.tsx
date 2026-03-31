import NewsClient from "@/components/NewsClient";

export const dynamic = "force-dynamic";

export default function NewsPage() {
  return (
    <div className="flex-1 overflow-y-auto w-full">
      <NewsClient />
    </div>
  );
}
