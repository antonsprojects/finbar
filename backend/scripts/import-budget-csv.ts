import { Prisma, PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";

type Args = {
  csv: string;
  userEmail: string;
  jobName?: string;
  jobId?: string;
  apply: boolean;
  replaceExisting: boolean;
};

type CsvRow = string[];

type ParsedLine = {
  title: string;
  hours: number;
  hourlyRate: number;
  materialsDescription: string | null;
  materialCost: number;
  sourceRow: number;
};

type ParsedPhase = {
  name: string;
  lines: ParsedLine[];
  sourceRow: number;
};

const DEFAULT_CSV =
  "/Users/antonbensdorp/Downloads/Anton spreadsheets - BEGROTING PP12-2.csv";

function parseArgs(argv: string[]): Args {
  const out: Args = {
    csv: DEFAULT_CSV,
    userEmail: "finbarvanwijk@gmail.com",
    jobName: "PP 12 2",
    apply: false,
    replaceExisting: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (!v) throw new Error(`Missing value for ${a}`);
      return v;
    };
    if (a === "--csv") out.csv = next();
    else if (a === "--user-email") out.userEmail = next();
    else if (a === "--job-name") out.jobName = next();
    else if (a === "--job-id") out.jobId = next();
    else if (a === "--apply") out.apply = true;
    else if (a === "--replace-existing") out.replaceExisting = true;
    else if (a === "--dry-run") out.apply = false;
    else if (a === "--help" || a === "-h") {
      console.log(`Usage:
tsx scripts/import-budget-csv.ts --csv <file.csv> --user-email <email> (--job-name <name> | --job-id <id>) [--dry-run] [--apply] [--replace-existing]

Defaults:
  --csv ${DEFAULT_CSV}
  --user-email finbarvanwijk@gmail.com
  --job-name "PP 12 2"

By default this is a dry-run. Use --apply to write. Use --replace-existing only
when you intentionally want to delete the existing begroting for the project.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (!out.jobName && !out.jobId) {
    throw new Error("Provide --job-name or --job-id");
  }
  return out;
}

function parseCsv(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

function clean(s: string | undefined): string {
  return (s ?? "").replace(/\\,/g, ",").trim();
}

function parseEuro(raw: string | undefined): number {
  const s = clean(raw)
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!s || s === "-") return 0;
  const n = Number(s.replace(/%$/, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseQty(raw: string | undefined): number {
  const s = clean(raw).replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function hasAnyMeaningfulCell(row: CsvRow): boolean {
  return row.some((c) => clean(c) !== "");
}

function isFormulaEmptyRow(row: CsvRow): boolean {
  const title = clean(row[0]) || clean(row[1]) || clean(row[2]);
  if (title) return false;
  const numeric = [5, 7, 8, 10, 11, 13, 14].map((i) => parseEuro(row[i]));
  return numeric.every((n) => n === 0);
}

function materialMeta(row: CsvRow): string | null {
  const bits: string[] = [];
  const notes = clean(row[2]);
  const uitvoer = clean(row[3]);
  const verantwoordelijke = clean(row[4]);
  const unit = clean(row[6]);
  const qty = clean(row[7]);
  const btw = clean(row[12]);
  if (notes) bits.push(notes);
  if (uitvoer) bits.push(`Uitvoering: ${uitvoer}`);
  if (verantwoordelijke) bits.push(`Verantwoordelijk: ${verantwoordelijke}`);
  if (unit || qty) bits.push(`Eenheid/aantal: ${unit || "-"} x ${qty || "0"}`);
  if (btw) bits.push(`BTW: ${btw}`);
  return bits.length ? bits.join(" | ") : null;
}

function hasMoney(row: CsvRow): boolean {
  return [5, 8, 10, 11, 13, 14].some((i) => parseEuro(row[i]) > 0);
}

function lineFromRow(row: CsvRow, title: string, sourceRow: number): ParsedLine {
  const unit = clean(row[6]).toUpperCase();
  const qty = parseQty(row[7]);
  const price = parseEuro(row[5]);
  const verkoopEx = parseEuro(row[11]);
  const inkoopEx = parseEuro(row[8]);
  const percentageEur = parseEuro(row[10]);

  const isLabor = unit === "P/U" || unit === "PU" || unit === "PER UUR";
  const materialCost = isLabor
    ? 0
    : verkoopEx || inkoopEx + percentageEur || price * (qty || 1);

  return {
    title: title.slice(0, 500),
    hours: isLabor ? qty : 0,
    hourlyRate: isLabor ? price : 0,
    materialsDescription: materialMeta(row),
    materialCost,
    sourceRow,
  };
}

function parseBudget(rows: CsvRow[]): ParsedPhase[] {
  const phases: ParsedPhase[] = [];
  let current: ParsedPhase | null = null;

  const ensurePhase = (name: string, sourceRow: number) => {
    current = { name: name.slice(0, 200), lines: [], sourceRow };
    phases.push(current);
    return current;
  };

  const fallback = () => current ?? ensurePhase("Import", 0);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sourceRow = i + 1;
    if (!hasAnyMeaningfulCell(row) || isFormulaEmptyRow(row)) continue;
    if (clean(row[0]) === "CHECK" || clean(row[2]) === "TOTALEN") continue;
    if (sourceRow < 8) continue;

    const first = clean(row[0]);
    const work = clean(row[1]);
    const notes = clean(row[2]);
    const title = work || first || notes;
    if (!title) continue;

    const rowHasMoney = hasMoney(row);
    const rowHasDetails = Boolean(notes || clean(row[3]) || clean(row[4]));
    const unit = clean(row[6]);
    const qty = parseQty(row[7]);

    // Spreadsheet section headers generally have a title in CHECK or WERKZAAMHEDEN,
    // no notes/executor fields, and no unit/quantity. Some also carry a section total.
    const isSectionHeader =
      !rowHasDetails &&
      !unit &&
      qty === 0 &&
      (Boolean(first && !work) || (!first && Boolean(work) && !rowHasMoney));

    if (isSectionHeader) {
      const phase = ensurePhase(title, sourceRow);
      if (rowHasMoney) {
        phase.lines.push(lineFromRow(row, title, sourceRow));
      }
      continue;
    }

    fallback().lines.push(lineFromRow(row, title, sourceRow));
  }

  return phases.filter((p) => p.lines.length > 0 || p.sourceRow > 0);
}

function totals(phases: ParsedPhase[]) {
  const phaseCount = phases.length;
  const lineCount = phases.reduce((sum, p) => sum + p.lines.length, 0);
  const materialTotal = phases.reduce(
    (sum, p) => sum + p.lines.reduce((s, l) => s + l.materialCost, 0),
    0,
  );
  const laborTotal = phases.reduce(
    (sum, p) => sum + p.lines.reduce((s, l) => s + l.hours * l.hourlyRate, 0),
    0,
  );
  return { phaseCount, lineCount, materialTotal, laborTotal };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const csvPath = path.resolve(args.csv);
  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  const phases = parseBudget(rows);
  const summary = totals(phases);

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email: args.userEmail },
      select: { id: true, email: true },
    });
    if (!user) throw new Error(`User not found: ${args.userEmail}`);

    const jobs = await prisma.job.findMany({
      where: {
        userId: user.id,
        ...(args.jobId ? { id: args.jobId } : { name: args.jobName }),
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });
    if (jobs.length === 0) {
      throw new Error(
        `Project not found for ${args.userEmail}: ${args.jobId ?? args.jobName}`,
      );
    }
    if (jobs.length > 1) {
      throw new Error(
        `Multiple projects named "${args.jobName}" found. Re-run with --job-id. Matches: ${jobs
          .map((j) => `${j.name} (${j.id})`)
          .join(", ")}`,
      );
    }
    const job = jobs[0];
    const existingPhaseCount = await prisma.budgetPhase.count({
      where: { jobId: job.id },
    });

    console.log(`CSV: ${csvPath}`);
    console.log(`Target user: ${user.email}`);
    console.log(`Target project: ${job.name} (${job.id})`);
    console.log(
      `Mode: ${args.apply ? "APPLY" : "DRY RUN"} / ${args.replaceExisting ? "replace existing" : "append"}`,
    );
    console.log(
      `Parsed: ${summary.phaseCount} phases, ${summary.lineCount} lines, labor ${summary.laborTotal.toFixed(
        2,
      )}, material ${summary.materialTotal.toFixed(2)}`,
    );
    console.log(`Existing phases on project: ${existingPhaseCount}`);
    console.log("Preview:");
    for (const p of phases.slice(0, 12)) {
      console.log(`- ${p.name}: ${p.lines.length} lines`);
    }
    if (phases.length > 12) console.log(`... ${phases.length - 12} more phases`);

    if (!args.apply) {
      console.log("Dry run only. Re-run with --apply to write.");
      return;
    }

    await prisma.$transaction(async (tx) => {
      if (args.replaceExisting) {
        await tx.budgetPhase.deleteMany({ where: { jobId: job.id } });
      }
      const last = await tx.budgetPhase.findFirst({
        where: { jobId: job.id },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      let phaseSort = last ? last.sortOrder + 1 : 0;
      for (const phase of phases) {
        const createdPhase = await tx.budgetPhase.create({
          data: {
            jobId: job.id,
            name: phase.name,
            sortOrder: phaseSort++,
          },
          select: { id: true },
        });
        await tx.budgetLine.createMany({
          data: phase.lines.map((line, sortOrder) => ({
            phaseId: createdPhase.id,
            title: line.title,
            hours: new Prisma.Decimal(line.hours),
            hourlyRate: new Prisma.Decimal(line.hourlyRate),
            materialsDescription: line.materialsDescription,
            materialCost: new Prisma.Decimal(line.materialCost),
            sortOrder,
          })),
        });
      }
    });

    console.log(
      `Imported ${summary.phaseCount} phases and ${summary.lineCount} lines.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
