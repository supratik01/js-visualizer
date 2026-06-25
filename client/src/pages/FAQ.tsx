import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { faqs } from '@/data/faqs';
import { useSEO } from '@/hooks/useSEO';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function FAQ() {
  useSEO({
    title: 'FAQ — JS Visualizer | JavaScript Event Loop Questions Answered',
    description:
      'Answers to common questions about the JavaScript event loop, microtasks vs macrotasks, the call stack, async/await, and how to use JS Visualizer to learn them interactively.',
    path: '/faq',
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-[hsl(var(--app-bar))] border-b border-border px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-amber-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to JS Visualizer
        </Link>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
          <span className="text-xs font-bold tracking-widest">
            <span style={{ color: '#E2B135' }}>JS</span>
            <span className="ml-1 text-foreground">VISUALIZER</span>
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3">Frequently Asked Questions</h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-lg">
            Quick answers about the JavaScript event loop, the call stack, async/await, and how to
            get the most out of JS Visualizer.
          </p>
        </div>

        {/* Q&A accordion */}
        <Accordion type="single" collapsible defaultValue="faq-0" className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border-border"
            >
              <AccordionTrigger className="text-left text-[15px] font-semibold text-foreground hover:no-underline hover:text-amber-600 dark:hover:text-amber-400 [&[data-state=open]]:text-amber-600 dark:[&[data-state=open]]:text-amber-400">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-[15px] text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* CTA */}
        <div className="mt-16 rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
          <h3 className="text-lg font-bold text-foreground mb-2">Still curious?</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            The fastest way to understand the event loop is to <em>watch</em> it. Paste your code
            into JS Visualizer and step through it line by line.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-bold transition-colors"
          >
            Open JS Visualizer — Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 mt-16 text-center">
        <p className="text-xs text-muted-foreground/60">
          © 2026{' '}
          <a
            href="https://bytefront.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            Bytefront
          </a>
        </p>
      </footer>
    </div>
  );
}
