import { useState } from 'react';
import { MessageSquare, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const ACCESS_KEY = import.meta.env.VITE_W3FORMS_ACCESS_KEY as string;

type FeedbackType = 'general' | 'bug' | 'feature' | 'praise';

const FEEDBACK_LABELS: Record<FeedbackType, string> = {
  general: 'General Feedback',
  bug: '🐛 Bug Report',
  feature: '✨ Feature Request',
  praise: '🎉 I Love This Tool',
};

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  function resetForm() {
    setName('');
    setEmail('');
    setType('general');
    setMessage('');
    setSubmitted(false);
  }

  function handleClose(v: boolean) {
    if (!v) {
      setOpen(false);
      // delay reset so the closing animation finishes
      setTimeout(resetForm, 300);
    } else {
      setOpen(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: ACCESS_KEY,
          subject: `[JS Visualizer] ${FEEDBACK_LABELS[type]}`,
          from_name: name.trim() || 'Anonymous',
          email: email.trim() || 'no-reply@jsvisualizer.bytefront.dev',
          message: message.trim(),
          feedback_type: FEEDBACK_LABELS[type],
          // honeypot — must be empty
          botcheck: '',
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        throw new Error(data.message || 'Submission failed');
      }
    } catch (err) {
      toast({
        title: 'Could not send feedback',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold shadow-lg shadow-amber-900/30 transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        Feedback
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md w-[95vw] bg-zinc-950 border-zinc-800 p-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <DialogTitle className="text-sm font-bold text-zinc-100">
                Share Your Feedback
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-500">
              Bug report, feature idea, or just a kind word — all welcome.
            </DialogDescription>
          </div>

          {submitted ? (
            /* ── Success state ── */
            <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" aria-hidden="true" />
              <p className="text-sm font-semibold text-zinc-100">Thanks for your feedback!</p>
              <p className="text-xs text-zinc-500 max-w-xs">
                I read every submission and use it to make JS Visualizer better.
              </p>
              <Button
                onClick={() => handleClose(false)}
                className="mt-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-6"
              >
                Close
              </Button>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Honeypot — invisible, must stay empty */}
              <input type="checkbox" name="botcheck" className="hidden" aria-hidden="true" />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fb-name" className="text-xs text-zinc-400">
                    Name <span className="text-zinc-600">(optional)</span>
                  </Label>
                  <Input
                    id="fb-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 text-sm h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fb-email" className="text-xs text-zinc-400">
                    Email <span className="text-zinc-600">(optional)</span>
                  </Label>
                  <Input
                    id="fb-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 text-sm h-8"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fb-type" className="text-xs text-zinc-400">
                  Type
                </Label>
                <Select value={type} onValueChange={(v) => setType(v as FeedbackType)}>
                  <SelectTrigger
                    id="fb-type"
                    className="bg-zinc-900 border-zinc-700 text-zinc-200 text-sm h-8"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {(Object.entries(FEEDBACK_LABELS) as [FeedbackType, string][]).map(
                      ([val, label]) => (
                        <SelectItem
                          key={val}
                          value={val}
                          className="text-zinc-200 hover:bg-zinc-800 focus:bg-zinc-800 text-sm"
                        >
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fb-message" className="text-xs text-zinc-400">
                  Message <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="fb-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind…"
                  required
                  rows={4}
                  className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 text-sm resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 text-xs h-8 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs h-8 px-4 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" aria-hidden="true" />
                  ) : (
                    <Send className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  )}
                  {submitting ? 'Sending…' : 'Send Feedback'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
