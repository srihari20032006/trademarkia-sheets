import { SpreadsheetEditor } from "@/components/grid/SpreadsheetEditor";

interface EditorPageProps {
  params: Promise<{ docId: string }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { docId } = await params;
  return <SpreadsheetEditor docId={docId} />;
}
