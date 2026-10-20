import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const publicPdf = path.join(process.cwd(), 'public', 'CODAK_Master_Feature_Workflow_Dossier.pdf');
  const fallbackRoot = path.join(process.cwd(), 'CODAK_Master_Feature_Workflow_Dossier.pdf');
  const externalDoc = '/Users/sidd/Documents/CODAK_Master_Feature_Workflow_Dossier.pdf';

  let chosenPath = '';
  if (fs.existsSync(/*turbopackIgnore: true*/ publicPdf)) {
    chosenPath = publicPdf;
  } else if (fs.existsSync(/*turbopackIgnore: true*/ fallbackRoot)) {
    chosenPath = fallbackRoot;
  } else if (fs.existsSync(/*turbopackIgnore: true*/ externalDoc)) {
    chosenPath = externalDoc;
  }

  if (!chosenPath) {
    return new NextResponse('PDF documentation file not found.', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(/*turbopackIgnore: true*/ chosenPath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="CODAK_Master_Feature_Workflow_Dossier.pdf"',
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
