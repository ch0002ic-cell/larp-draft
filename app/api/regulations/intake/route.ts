import { readSavedLawChanges, saveLawChange, type LawChangeDraft } from "@/lib/regulation-intake";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
  return Response.json({ records: await readSavedLawChanges() });
  } catch {
    return Response.json({ error: "Requested records are unavailable. Check the source service and saved evidence." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { draft?: LawChangeDraft; confirmed?: boolean };
    if (!body.confirmed || !body.draft) return Response.json({ error: "A reviewed draft and explicit confirmation are required." }, { status: 400 });
    return Response.json({ record: await saveLawChange(body.draft) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "R2_NOT_CONFIGURED") return Response.json({ error: "R2 write credentials are not configured." }, { status: 503 });
    if (error instanceof Error && error.message === "INVALID_LAW_CHANGE") return Response.json({ error: "The draft needs a summary and at least one allowed official source." }, { status: 400 });
    console.error("Unable to save reviewed law change", error);
    return Response.json({ error: "The reviewed change could not be saved to the Regulations area in R2." }, { status: 502 });
  }
}
