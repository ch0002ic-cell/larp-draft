import { getR2Object, listR2Objects } from "@/lib/r2";
import {
  inferclient,
  inferDocumentType,
  type ContractDocumentType,
} from "@/lib/contract-metadata";

export const dynamic = "force-dynamic";

type ContractManifestItem = {
  key: string;
  name?: string;
  section?: string;
  dependency?: string;
  currentAssumption?: string;
  updatedRequirement?: string;
  reason?: string;
  status?: "Outdated" | "Needs Review" | "Still Valid" | "Validated";
  client?: string;
  documentType?: ContractDocumentType;
};

const supportedExtensions = new Set([
  "pdf",
  "doc",
  "docx",
  "txt",
  "md",
  "json",
]);
const titleFromKey = (key: string) =>
  decodeURIComponent(key.split("/").pop() ?? key)
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export async function GET() {
  const prefix = process.env.R2_CONTRACT_PREFIX ?? "Contracts/";
  const manifestKey = process.env.R2_CONTRACT_MANIFEST ?? `${prefix}index.json`;

  try {
    const objects = (await listR2Objects(prefix)).filter((object) =>
      supportedExtensions.has(object.key.split(".").pop()?.toLowerCase() ?? ""),
    );
    let manifest: ContractManifestItem[] = [];
    const manifestObject = objects.find((object) => object.key === manifestKey);

    if (manifestObject) {
      const response = await getR2Object(manifestKey);
      if (!response.ok) throw new Error("Contract manifest unavailable.");
      {
        const parsed = (await response.json()) as
          | ContractManifestItem[]
          | { contracts?: ContractManifestItem[] };
        manifest = Array.isArray(parsed) ? parsed : (parsed.contracts ?? []);
      }
    }

    const records = objects
      .filter((object) => object.key !== manifestKey)
      .map((object) => {
        const metadata = manifest.find((item) => item.key === object.key);
        const format = object.key.split(".").pop()?.toLowerCase() ?? "file";
        return {
          id: object.etag || object.key,
          key: object.key,
          name: metadata?.name ?? titleFromKey(object.key),
          section: metadata?.section ?? "Contract document",
          dependency: metadata?.dependency ?? "Data Breach Notification",
          currentAssumption:
            metadata?.currentAssumption ?? "Requires extraction",
          updatedRequirement:
            metadata?.updatedRequirement ??
            "Assess and notify qualifying breaches",
          reason:
            metadata?.reason ??
            "Stored contract requires validation against the PDPA data-breach notification framework.",
          status: metadata?.status ?? "Needs Review",
          size: object.size,
          lastModified: object.lastModified,
          format,
          editable: format === "docx",
          convertible: format === "pdf",
          client:
            metadata?.client?.trim() ||
            inferclient(object.key, metadata?.name ?? titleFromKey(object.key)),
          documentType:
            metadata?.documentType ??
            inferDocumentType(
              object.key,
              metadata?.name ?? titleFromKey(object.key),
            ),
          downloadUrl: `/api/contracts/${object.key.split("/").map(encodeURIComponent).join("/")}`,
        };
      });

    return Response.json({
      source: "r2",
      bucket: process.env.R2_BUCKET_NAME,
      prefix,
      contracts: records,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "R2_NOT_CONFIGURED") {
      return Response.json(
        {
          source: "unconfigured",
          contracts: [],
          error: "Add the R2 credentials shown in .env.example to .env.local.",
        },
        { status: 503 },
      );
    }
    console.error("Unable to load R2 contracts", error);
    return Response.json(
      {
        source: "r2",
        contracts: [],
        error: "The contract bucket could not be read.",
      },
      { status: 502 },
    );
  }
}
