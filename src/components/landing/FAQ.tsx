'use client';

import { useState } from 'react';
import { Plus, Minus, Mail } from 'lucide-react';
import { FAQ_ITEMS } from '@/lib/landingDefaults';
import Logo from '@/components/Logo';

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="py-20">
      <div className="container-page">
        <h2 className="mb-12 text-center text-4xl font-extrabold tracking-tight md:text-5xl">
          Frequently Asked <span className="gradient-text">Questions</span>
        </h2>
        <div className="surface divide-y" style={{ borderColor: 'var(--border)' }}>
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ borderColor: 'var(--border)' }} className="divide-y">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                >
                  <span className="font-semibold">{item.q}</span>
                  <span className="text-accent">{isOpen ? <Minus size={20} /> : <Plus size={20} />}</span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="py-20">
      <div className="container-page">
        <div className="surface p-10 text-center">
          <h3 className="text-2xl font-bold">
            Still have a query? Drop your Questions at our Support <span className="gradient-text">Email</span>
          </h3>
          <a
            href="mailto:support@captionist.app"
            className="btn-primary mx-auto mt-8 w-fit"
          >
            <Mail size={18} /> Email Us
          </a>
          <div className="mx-auto mt-10 grid max-w-md grid-cols-2 gap-y-4 text-left">
            <a href="/terms" style={{ color: 'var(--text)' }} className="hover:opacity-70">Terms &amp; Conditions</a>
            <a href="https://instagram.com" style={{ color: 'var(--text)' }} className="hover:opacity-70">Instagram</a>
            <a href="/privacy" style={{ color: 'var(--text)' }} className="hover:opacity-70">Privacy Policy</a>
            <a href="https://linkedin.com" style={{ color: 'var(--text)' }} className="hover:opacity-70">LinkedIn</a>
          </div>
        </div>
        <div className="mt-8 flex justify-center">
          <Logo className="!text-xl opacity-60" />
        </div>
      </div>
    </footer>
  );
}
