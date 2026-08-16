import { useRef, useState } from 'react';
import { FileText, Sparkles, Upload, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button, Card, CardContent, Textarea, Badge } from '@/components/ui';
import { extractTextFromPdf } from '@/lib/pdf';
import { notify } from '@/lib/toast';
import { useAnalyzeResume } from '@/features/career/hooks/useCareer';
import type { CareerProfile } from '@/types/database';

export function ResumeUploadPanel({ careerProfile, trackLabel }: { careerProfile: CareerProfile; trackLabel: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const analyzeResume = useAnalyzeResume();
  const [pastedText, setPastedText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showReupload, setShowReupload] = useState(false);

  const analysis = careerProfile.resume_analysis;
  const hasAnalysis = !!analysis && !showReupload;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      notify.error('Please upload a PDF resume, or paste the text instead.');
      return;
    }
    setIsExtracting(true);
    try {
      const { text } = await extractTextFromPdf(file);
      if (text.trim().length < 30) {
        notify.error('Could not read enough text from this PDF. Try pasting the resume text instead.');
        setShowPaste(true);
        return;
      }
      await analyzeResume.mutateAsync({ careerProfile, resumeText: text, fileName: file.name, roleLabel: trackLabel });
      setShowReupload(false);
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleAnalyzePastedText() {
    if (pastedText.trim().length < 30) {
      notify.error('Paste a bit more of your resume text first.');
      return;
    }
    await analyzeResume.mutateAsync({ careerProfile, resumeText: pastedText, fileName: 'Pasted resume text', roleLabel: trackLabel });
    setShowReupload(false);
    setPastedText('');
    setShowPaste(false);
  }

  const isBusy = isExtracting || analyzeResume.isPending;

  if (hasAnalysis) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-ink-900">Resume analyzed for {trackLabel}</p>
                <p className="mt-0.5 text-sm text-ink-500">
                  {careerProfile.resume_file_name} ·{' '}
                  {careerProfile.resume_analyzed_at ? new Date(careerProfile.resume_analyzed_at).toLocaleDateString() : ''}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setShowReupload(true)}>
              Upload a different resume
            </Button>
          </div>

          <p className="text-sm text-ink-600">{analysis!.summary}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold text-ink-900">Upload your resume</p>
          <p className="mt-1 max-w-md text-sm text-ink-500">
            We'll read it end-to-end and analyze it against <Badge variant="brand">{trackLabel}</Badge> to find your
            skill gaps, then use that to tailor your interview prep and career roadmap.
          </p>
        </div>

        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />

        {!showPaste ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button leftIcon={<Upload className="h-4 w-4" />} isLoading={isBusy} onClick={() => inputRef.current?.click()}>
              Upload resume (PDF)
            </Button>
            <Button variant="outline" disabled={isBusy} onClick={() => setShowPaste(true)}>
              Paste text instead
            </Button>
            {showReupload && (
              <Button variant="ghost" disabled={isBusy} onClick={() => setShowReupload(false)}>
                Cancel
              </Button>
            )}
          </div>
        ) : (
          <div className="flex w-full max-w-lg flex-col gap-3">
            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste the full text of your resume here..."
              rows={8}
            />
            <div className="flex justify-center gap-2">
              <Button leftIcon={<Sparkles className="h-4 w-4" />} isLoading={isBusy} onClick={handleAnalyzePastedText}>
                Analyze resume
              </Button>
              <Button variant="ghost" disabled={isBusy} onClick={() => setShowPaste(false)}>
                Back to upload
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
