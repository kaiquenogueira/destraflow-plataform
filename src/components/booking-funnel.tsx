"use client";

import React, { useState, useEffect, useMemo, useCallback, useId } from "react";
import { Check, Calendar as CalendarIcon, Clock, ArrowRight, ArrowLeft, ShieldCheck, Download, ExternalLink, X } from "lucide-react";

interface LeadData {
  perfil: string;
  trafego: string;
  trafego_interesse: string;
  interesse: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
  nome: string;
  email: string;
  whatsapp: string;
  consent: boolean;
  criadoEm?: string;
}

interface AgendaModalPayload {
  n?: string;
  e?: string;
  w?: string;
  d?: string;
  h?: string;
  p?: string;
  t?: string;
  ti?: string;
  i?: string;
}

const CONFIG = {
  whatsapp: "5511968260206",
  timezone: "America/Sao_Paulo",
  hourStart: 14,
  hourEnd: 20,
  slotMinutes: 60,
  durationMinutes: 45,
  daysOffered: 8,
  includeWeekends: false,
  minHoursAhead: 3,
  eventTitle: "Destraflow Tech · Vídeo conferência",
  eventLocation: "Vídeo conferência (link enviado por WhatsApp)",
  organizerEmail: "contato@destraflow.com.br",
  bookingEndpoint: "",
  leadWebhook: "",
};

const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Timezone conversion helpers
function pad(n: number) {
  return String(n).padStart(2, "0");
}

function tzOffsetAt(utcMs: number, tz: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) {
    if (part.type !== "literal") p[part.type] = +part.value;
  }
  return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - utcMs;
}

function zonedTime(y: number, m: number, d: number, hh: number, mm: number, tz: string) {
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  const off1 = tzOffsetAt(guess, tz);
  const off2 = tzOffsetAt(guess - off1, tz);
  return new Date(guess - off2);
}

function todayInTZ(tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const p: Record<string, number> = {};
  parts.forEach((part) => {
    if (part.type !== "literal") p[part.type] = +part.value;
  });
  return { y: p.year, m: p.month, d: p.day };
}

function digits(v: string) {
  return String(v).replace(/\D/g, "");
}

function b64url(txt: string) {
  if (typeof window === "undefined") return "";
  const bytes = new TextEncoder().encode(txt);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64url(txt: string) {
  if (typeof window === "undefined") return "";
  const bin = atob(txt.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

function icsEsc(v: string) {
  return String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\, ")
    .replace(/\n/g, "\\n");
}

export function BookingFunnel() {
  const [lead, setLead] = useState<LeadData>({
    perfil: "",
    trafego: "",
    trafego_interesse: "",
    interesse: "",
    data: "",
    horario: "",
    nome: "",
    email: "",
    whatsapp: "",
    consent: true,
  });

  const [nowMs, setNowMs] = useState<number>(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [icsDownloadUrl, setIcsDownloadUrl] = useState<string | null>(null);
  const [modalAgendaData, setModalAgendaData] = useState<AgendaModalPayload | null>(null);

  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const consentId = useId();

  // Toast handler
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3800);
  };

  // Determine dynamic funnel path based on traffic question branch
  const path = useMemo(() => {
    if (lead.trafego === "Não tenho hoje") {
      return ["perfil", "trafego", "trafego_interesse", "interesse", "agenda", "dados"];
    }
    return ["perfil", "trafego", "interesse", "agenda", "dados"];
  }, [lead.trafego]);

  const currentStepId = isSuccess ? "sucesso" : path[stepIndex] || "perfil";
  const progressPercent = isSuccess ? 100 : Math.round(((stepIndex + 1) / path.length) * 100);

  // Initialize client-side timestamp and check for ?agenda=... param
  useEffect(() => {
    const timer = setTimeout(() => {
      setNowMs(Date.now());

      try {
        const params = new URLSearchParams(window.location.search);
        const rawAgenda = params.get("agenda");
        if (rawAgenda) {
          const decoded = JSON.parse(unb64url(rawAgenda)) as AgendaModalPayload;
          if (decoded && decoded.d && decoded.h) {
            setModalAgendaData(decoded);
          }
        }
      } catch {
        // ignore
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Compute available days (8 business days in Sao Paulo timezone)
  const availableDays = useMemo(() => {
    if (!nowMs) return [];
    const hoje = todayInTZ(CONFIG.timezone);
    const d = new Date(hoje.y, hoje.m - 1, hoje.d);
    const result = [];
    let added = 0;
    let guard = 0;

    while (added < CONFIG.daysOffered && guard++ < 60) {
      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const lastSlot = zonedTime(d.getFullYear(), d.getMonth() + 1, d.getDate(), CONFIG.hourEnd, 0, CONFIG.timezone);
      const tooLateToday = lastSlot.getTime() - nowMs < CONFIG.minHoursAhead * 3600e3;

      if ((CONFIG.includeWeekends || !isWeekend) && !tooLateToday) {
        const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        result.push({
          iso,
          dow: WD[dow],
          day: pad(d.getDate()),
          month: MO[d.getMonth()],
        });
        added++;
      }
      d.setDate(d.getDate() + 1);
    }
    return result;
  }, [nowMs]);

  // Compute available hours for currently selected day
  const availableHours = useMemo(() => {
    if (!lead.data || !nowMs) return [];
    const [y, m, dd] = lead.data.split("-").map(Number);
    const hours = [];

    for (let h = CONFIG.hourStart; h <= CONFIG.hourEnd; h += CONFIG.slotMinutes / 60) {
      const slot = zonedTime(y, m, dd, Math.floor(h), (h % 1) * 60, CONFIG.timezone);
      if (slot.getTime() - nowMs < CONFIG.minHoursAhead * 3600e3) continue;
      const label = `${pad(Math.floor(h))}:${pad((h % 1) * 60)}`;
      hours.push(label);
    }
    return hours;
  }, [lead.data, nowMs]);

  // Compute formatted event dates & times
  const eventDetails = useMemo(() => {
    if (!lead.data || !lead.horario) return null;
    const [y, m, d] = lead.data.split("-").map(Number);
    const [hh, mm] = lead.horario.split(":").map(Number);
    const start = zonedTime(y, m, d, hh, mm, CONFIG.timezone);
    const end = new Date(start.getTime() + CONFIG.durationMinutes * 60000);

    const wall = (extraMin: number) => {
      const t = hh * 60 + mm + extraMin;
      const dd = new Date(Date.UTC(y, m - 1, d));
      dd.setUTCMinutes(dd.getUTCMinutes() + t);
      return (
        dd.getUTCFullYear() +
        pad(dd.getUTCMonth() + 1) +
        pad(dd.getUTCDate()) +
        "T" +
        pad(dd.getUTCHours()) +
        pad(dd.getUTCMinutes()) +
        "00"
      );
    };

    const utc = (dt: Date) =>
      dt.getUTCFullYear() +
      pad(dt.getUTCMonth() + 1) +
      pad(dt.getUTCDate()) +
      "T" +
      pad(dt.getUTCHours()) +
      pad(dt.getUTCMinutes()) +
      pad(dt.getUTCSeconds()) +
      "Z";

    const dtObj = new Date(y, m - 1, d);
    const humanDateStr = `${WD[dtObj.getDay()]}, ${pad(d)}/${pad(m)}/${y}`;

    return {
      start,
      end,
      startStr: wall(0),
      endStr: wall(CONFIG.durationMinutes),
      startUTC: utc(start),
      endUTC: utc(end),
      humanDateStr,
    };
  }, [lead.data, lead.horario]);

  const eventDescription = useMemo(() => {
    return [
      "Vídeo conferência Destraflow Tech.",
      "",
      `Nome: ${lead.nome}`,
      `E-mail: ${lead.email}`,
      `WhatsApp: ${lead.whatsapp}`,
      "",
      `Agência especializada em Orlando: ${lead.perfil}`,
      `Gestão de tráfego pago: ${lead.trafego}`,
      lead.trafego_interesse ? `Gostaria de ter tráfego pago: ${lead.trafego_interesse}` : "",
      `Interesse em CRM + IA: ${lead.interesse}`,
    ]
      .filter(Boolean)
      .join("\n");
  }, [lead]);

  const googleCalendarUrl = useMemo(() => {
    if (!eventDetails) return "#";
    const p = new URLSearchParams({
      action: "TEMPLATE",
      text: `${CONFIG.eventTitle} · ${lead.nome}`,
      dates: `${eventDetails.startStr}/${eventDetails.endStr}`,
      ctz: CONFIG.timezone,
      details: eventDescription,
      location: CONFIG.eventLocation,
    });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  }, [eventDetails, eventDescription, lead.nome]);

  const generateIcsUrl = (customData?: AgendaModalPayload | LeadData) => {
    const dataToUse = customData || lead;
    const rawData = "data" in dataToUse ? dataToUse.data : dataToUse.d;
    const rawHorario = "horario" in dataToUse ? dataToUse.horario : dataToUse.h;
    const rawNome = "nome" in dataToUse ? dataToUse.nome : dataToUse.n;
    const rawEmail = "email" in dataToUse ? dataToUse.email : dataToUse.e;

    if (!rawData || !rawHorario) return "#";

    const [y, m, d] = rawData.split("-").map(Number);
    const [hh, mm] = rawHorario.split(":").map(Number);
    const start = zonedTime(y, m, d, hh, mm, CONFIG.timezone);
    const end = new Date(start.getTime() + CONFIG.durationMinutes * 60000);

    const utc = (dt: Date) =>
      dt.getUTCFullYear() +
      pad(dt.getUTCMonth() + 1) +
      pad(dt.getUTCDate()) +
      "T" +
      pad(dt.getUTCHours()) +
      pad(dt.getUTCMinutes()) +
      pad(dt.getUTCSeconds()) +
      "Z";

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Destraflow Tech//Agendamento//PT-BR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${Date.now()}-${Math.random().toString(36).slice(2, 8)}@destraflow`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${utc(start)}`,
      `DTEND:${utc(end)}`,
      `SUMMARY:${icsEsc(`${CONFIG.eventTitle} · ${rawNome || "Reunião"}`)}`,
      `LOCATION:${icsEsc(CONFIG.eventLocation)}`,
      `DESCRIPTION:${icsEsc(eventDescription)}`,
    ];

    if (CONFIG.organizerEmail) {
      lines.push(`ORGANIZER;CN=Destraflow Tech:mailto:${CONFIG.organizerEmail}`);
    }
    if (rawEmail) {
      lines.push(`ATTENDEE;CN=${icsEsc(rawNome || "")};RSVP=TRUE:mailto:${rawEmail}`);
    }
    lines.push("END:VEVENT", "END:VCALENDAR");

    return URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
  };

  const addToCalendarLink = useCallback(() => {
    if (typeof window === "undefined" || window.location.protocol === "file:") return "";
    const dados: AgendaModalPayload = {
      n: lead.nome,
      e: lead.email,
      w: lead.whatsapp,
      d: lead.data,
      h: lead.horario,
      p: lead.perfil,
      t: lead.trafego,
      ti: lead.trafego_interesse,
      i: lead.interesse,
    };
    return `${window.location.origin}${window.location.pathname}?agenda=${b64url(JSON.stringify(dados))}`;
  }, [lead]);

  const whatsappUrl = useMemo(() => {
    if (!eventDetails) return "#";
    const oneTouchLink = addToCalendarLink();
    const text = [
      "Olá, Destraflow! Acabei de preencher o formulário para uma vídeo conferência.",
      "",
      `Nome: ${lead.nome}`,
      `E-mail: ${lead.email}`,
      `WhatsApp: ${lead.whatsapp}`,
      "",
      `Agência especializada em Orlando: ${lead.perfil}`,
      `Gestão de tráfego pago: ${lead.trafego}`,
      lead.trafego_interesse ? `Gostaria de ter tráfego pago: ${lead.trafego_interesse}` : "",
      `Interesse em CRM + IA: ${lead.interesse}`,
      "",
      `Dia e horário escolhidos: ${eventDetails.humanDateStr} às ${lead.horario} (horário de Brasília)`,
      "",
      "Gostaria de confirmar o agendamento da reunião.",
      oneTouchLink ? `\n— — —\nDestraflow, para lançar na agenda em 1 toque:\n${oneTouchLink}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
  }, [lead, eventDetails, addToCalendarLink]);

  // Handlers
  const handleSelectOption = (key: keyof LeadData, value: string) => {
    setLead((prev) => {
      const updated = { ...prev, [key]: value };
      if (key === "trafego" && value !== "Não tenho hoje") {
        updated.trafego_interesse = "";
      }
      return updated;
    });

    setTimeout(() => {
      setStepIndex((curr) => Math.min(curr + 1, path.length - 1));
    }, 180);
  };

  const handleNext = () => {
    const current = path[stepIndex];
    if (current === "agenda" && (!lead.data || !lead.horario)) {
      showToast("Por favor, selecione um dia e um horário.");
      return;
    }
    setStepIndex((curr) => Math.min(curr + 1, path.length - 1));
  };

  const handlePrev = () => {
    setStepIndex((curr) => Math.max(curr - 1, 0));
  };

  const handlePhoneChange = (val: string) => {
    const d = digits(val).slice(0, 11);
    const formatted =
      d.length > 10
        ? d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3")
        : d.length > 6
        ? d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
        : d.length > 2
        ? d.replace(/(\d{2})(\d{0,5})/, "($1) $2")
        : d;
    setLead((prev) => ({ ...prev, whatsapp: formatted }));
  };

  const validateContact = () => {
    if (!lead.nome.trim() || lead.nome.trim().length < 2) {
      showToast("Informe seu nome completo.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email.trim())) {
      showToast("Informe um e-mail válido.");
      return false;
    }
    if (digits(lead.whatsapp).length < 10) {
      showToast("Informe um WhatsApp válido com DDD.");
      return false;
    }
    if (!lead.consent) {
      showToast("Marque a autorização para entrarmos em contato.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateContact()) return;
    if (!lead.data || !lead.horario) {
      showToast("Volte uma etapa e escolha o dia e o horário.");
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const updatedLead = { ...lead, criadoEm: now };
      setLead(updatedLead);

      // Save locally
      try {
        const stored = JSON.parse(localStorage.getItem("destraflow_leads") || "[]");
        stored.push(updatedLead);
        localStorage.setItem("destraflow_leads", JSON.stringify(stored));
      } catch {
        // ignore storage errors
      }

      // Webhook integration (if configured)
      if (CONFIG.leadWebhook) {
        fetch(CONFIG.leadWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedLead),
        }).catch(() => {});
      }

      // Prepare ICS download
      const blobUrl = generateIcsUrl(updatedLead);
      setIcsDownloadUrl(blobUrl);

      setIsSuccess(true);

      // Trigger auto open WhatsApp after slight delay
      setTimeout(() => {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      }, 700);
    } catch {
      showToast("Ocorreu um erro ao registrar seu agendamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-5xl rounded-[24px] sm:rounded-[32px] border border-[#c7a06b]/25 bg-gradient-to-br from-[#15171a] via-[#0f1113] to-[#08090a] p-4 sm:p-8 lg:p-12 shadow-2xl overflow-hidden">
      {/* Decorative ambient glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#c7a06b]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#c7a06b]/5 blur-3xl" />

      {/* Toast Notification (above mobile sticky bar) */}
      {toastMsg && (
        <div className="fixed bottom-24 sm:bottom-10 left-1/2 z-50 -translate-x-1/2 max-w-[90vw] text-center rounded-2xl border border-[#c7a06b] bg-[#15171a] px-4 py-3 text-xs sm:text-sm font-medium text-white shadow-2xl transition-all">
          {toastMsg}
        </div>
      )}

      {/* 1-Click Calendar Modal for Destraflow Team (from URL ?agenda=...) */}
      {modalAgendaData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-[#c7a06b]/30 bg-[#121417] p-5 sm:p-7 text-white shadow-2xl relative">
            <button
              onClick={() => setModalAgendaData(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c7a06b]/15 text-[#e3c79b] mb-4">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Lançar reunião na agenda</h3>
            <div className="my-4 rounded-2xl border border-[#c7a06b]/20 bg-[#c7a06b]/5 p-4 text-sm leading-relaxed text-[#d8d3cb]">
              <b className="text-white">{modalAgendaData.n}</b>
              <br />
              Data e horário: <b className="text-[#e3c79b]">{modalAgendaData.d} às {modalAgendaData.h}</b> (Brasília)
              <br />
              {modalAgendaData.w && <span>WhatsApp: {modalAgendaData.w}<br /></span>}
              {modalAgendaData.e && <span>E-mail: {modalAgendaData.e}<br /></span>}
              Especialista em Orlando: {modalAgendaData.p}
            </div>
            <button
              onClick={() => {
                const url = generateIcsUrl({
                  n: modalAgendaData.n,
                  e: modalAgendaData.e,
                  w: modalAgendaData.w,
                  d: modalAgendaData.d,
                  h: modalAgendaData.h,
                  p: modalAgendaData.p,
                  t: modalAgendaData.t,
                  i: modalAgendaData.i,
                });
                const a = document.createElement("a");
                a.href = url;
                a.download = `reuniao-destraflow-${modalAgendaData.d}.ics`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                showToast("Convite baixado para sua agenda.");
                setModalAgendaData(null);
              }}
              className="btn-gold w-full"
            >
              <Download className="h-4 w-4" />
              Adicionar à minha agenda
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14 items-start">
        {/* Left column: Context & Guarantee */}
        <div className="space-y-5 sm:space-y-6">
          <div className="kicker">Vamos conversar?</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
            Agende sua <span className="gold-gradient-text">vídeo conferência.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#a8a39b] leading-relaxed">
            Quatro perguntas rápidas, você escolhe dia e horário entre 14h e 20h, e deixa seus dados. Ao final abrimos o WhatsApp com tudo resumido para o nosso time confirmar.
          </p>

          <ul className="space-y-3 sm:space-y-3.5 text-xs sm:text-sm text-[#d8d3cb]">
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-[#c7a06b]/15 text-xs text-[#e3c79b]">
                <Clock className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
              </span>
              <span>45 minutos, por vídeo chamada</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-[#c7a06b]/15 text-xs text-[#e3c79b]">
                <ShieldCheck className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
              </span>
              <span>Diagnóstico da sua operação, sem compromisso</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-[#c7a06b]/15 text-xs text-[#e3c79b]">
                <Check className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
              </span>
              <span>Você fala direto com quem desenha e implanta o sistema</span>
            </li>
          </ul>

          <div className="rounded-xl sm:rounded-2xl border border-[#c7a06b]/20 bg-[#c7a06b]/[0.06] p-3.5 sm:p-4 text-xs leading-relaxed text-[#c9c5be]">
            <strong className="text-[#e3c79b]">Sem custo e sem obrigação comercial.</strong>
            <br />
            Se avaliarmos que a solução não faz sentido para a sua agência hoje, a gente fala com total transparência na própria reunião.
          </div>
        </div>

        {/* Right column: Interactive Funnel Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0e1012]/80 p-4 sm:p-7 backdrop-blur-md">
          {/* Progress bar */}
          <div className="mb-5 sm:mb-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#8d8880]">
              <span>{isSuccess ? "Concluído" : `Etapa ${stepIndex + 1} de ${path.length}`}</span>
              <span className="text-[#e3c79b]">{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#a67f4c] via-[#c7a06b] to-[#e3c79b] transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* STEP 1: Perfil */}
          {currentStepId === "perfil" && (
            <div className="animate-fade-in space-y-5">
              <div>
                <h3 className="text-xl font-bold text-white sm:text-2xl">
                  Você possui uma agência de viagens especializada em Orlando?
                </h3>
                <p className="mt-1 text-sm text-[#a8a39b]">
                  Queremos entender se o perfil da sua operação combina com a nossa especialidade.
                </p>
              </div>
              <div className="grid gap-2.5">
                {[
                  { value: "Sim, especializada em Orlando", label: "Sim, somos especializados em Orlando" },
                  { value: "Vende Orlando, sem ser o foco", label: "Vendemos Orlando, mas não é o foco único" },
                  { value: "Começando agora", label: "Estou começando agora a agência" },
                  { value: "Não tenho agência", label: "Ainda não tenho agência montada" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectOption("perfil", opt.value)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm font-semibold transition-all ${
                      lead.perfil === opt.value
                        ? "border-[#e3c79b] bg-[#c7a06b]/15 text-white"
                        : "border-white/[0.08] bg-[#141618] text-[#d8d3cb] hover:border-[#c7a06b]/50 hover:bg-[#181b1e]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <ArrowRight className="h-4 w-4 text-[#e3c79b]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Tráfego pago */}
          {currentStepId === "trafego" && (
            <div className="animate-fade-in space-y-5">
              <div>
                <h3 className="text-xl font-bold text-white sm:text-2xl">
                  Você tem gestão de tráfego pago na sua agência?
                </h3>
                <p className="mt-1 text-sm text-[#a8a39b]">
                  Isso ajuda a entender o volume de leads que chega hoje no seu WhatsApp.
                </p>
              </div>
              <div className="grid gap-2.5">
                {[
                  { value: "Sim, com agência ou especialista", label: "Sim, com agência ou gestor parceiro" },
                  { value: "Sim, faço por conta própria", label: "Sim, faço os anúncios por conta própria" },
                  { value: "Não tenho hoje", label: "Não tenho tráfego pago rodando hoje" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectOption("trafego", opt.value)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm font-semibold transition-all ${
                      lead.trafego === opt.value
                        ? "border-[#e3c79b] bg-[#c7a06b]/15 text-white"
                        : "border-white/[0.08] bg-[#141618] text-[#d8d3cb] hover:border-[#c7a06b]/50 hover:bg-[#181b1e]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <ArrowRight className="h-4 w-4 text-[#e3c79b]" />
                  </button>
                ))}
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-2 text-xs font-semibold text-[#8d8880] hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                </button>
              </div>
            </div>
          )}

          {/* STEP 2b: Interesse em tráfego (Condicional) */}
          {currentStepId === "trafego_interesse" && (
            <div className="animate-fade-in space-y-5">
              <div>
                <h3 className="text-xl font-bold text-white sm:text-2xl">
                  Você gostaria de ter gestão de tráfego pago?
                </h3>
                <p className="mt-1 text-sm text-[#a8a39b]">
                  Tráfego só compensa quando o atendimento dá conta do volume — é aí que o CRM e a IA entram.
                </p>
              </div>
              <div className="grid gap-2.5">
                {[
                  { value: "Sim, tenho interesse", label: "Sim, tenho interesse em acelerar anúncios" },
                  { value: "Talvez, quero entender melhor", label: "Talvez, quero entender como funciona" },
                  { value: "Agora não é prioridade", label: "Agora não é prioridade para mim" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectOption("trafego_interesse", opt.value)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm font-semibold transition-all ${
                      lead.trafego_interesse === opt.value
                        ? "border-[#e3c79b] bg-[#c7a06b]/15 text-white"
                        : "border-white/[0.08] bg-[#141618] text-[#d8d3cb] hover:border-[#c7a06b]/50 hover:bg-[#181b1e]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <ArrowRight className="h-4 w-4 text-[#e3c79b]" />
                  </button>
                ))}
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-2 text-xs font-semibold text-[#8d8880] hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Interesse na Solução */}
          {currentStepId === "interesse" && (
            <div className="animate-fade-in space-y-5">
              <div>
                <h3 className="text-xl font-bold text-white sm:text-2xl">
                  A Destraflow apoia a implantação de CRM especialista em Orlando com IA integrada. Qual seu interesse?
                </h3>
                <p className="mt-1 text-sm text-[#a8a39b]">
                  É essa tecnologia e operação que vamos apresentar na demonstração ao vivo.
                </p>
              </div>
              <div className="grid gap-2.5">
                {[
                  { value: "Sim, quero implantar na agência", label: "Sim, quero implantar na minha agência" },
                  { value: "Quero entender melhor antes", label: "Quero entender melhor como funciona antes" },
                  { value: "Agora não é prioridade", label: "Apenas pesquisando, não é prioridade agora" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectOption("interesse", opt.value)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm font-semibold transition-all ${
                      lead.interesse === opt.value
                        ? "border-[#e3c79b] bg-[#c7a06b]/15 text-white"
                        : "border-white/[0.08] bg-[#141618] text-[#d8d3cb] hover:border-[#c7a06b]/50 hover:bg-[#181b1e]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <ArrowRight className="h-4 w-4 text-[#e3c79b]" />
                  </button>
                ))}
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-2 text-xs font-semibold text-[#8d8880] hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Agenda (Dias e Horários) */}
          {currentStepId === "agenda" && (
            <div className="animate-fade-in space-y-5">
              <div>
                <h3 className="text-xl font-bold text-white sm:text-2xl">
                  Qual dia e horário você prefere?
                </h3>
                <p className="mt-1 text-sm text-[#a8a39b]">
                  Atendemos das 14h às 20h (horário de Brasília). Selecione a janela ideal para você.
                </p>
              </div>

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-widest text-[#8d8880] mb-2.5">
                  1. Escolha o dia
                </span>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none touch-pan-x">
                  {availableDays.map((d) => {
                    const isSelected = lead.data === d.iso;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => setLead((prev) => ({ ...prev, data: d.iso, horario: "" }))}
                        className={`flex flex-col items-center justify-center min-w-[64px] sm:min-w-[72px] shrink-0 rounded-xl border py-2 sm:py-2.5 px-2.5 sm:px-3 transition-all ${
                          isSelected
                            ? "border-[#e3c79b] bg-[#c7a06b]/20 text-white"
                            : "border-white/[0.08] bg-[#141618] text-[#8d8880] hover:border-[#c7a06b]/40 hover:text-white"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold tracking-wider">{d.dow}</span>
                        <span className="text-base sm:text-lg font-extrabold text-white my-0.5">{d.day}</span>
                        <span className="text-[10px] uppercase tracking-wider">{d.month}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-widest text-[#8d8880] mb-2.5">
                  2. Escolha o horário (14:00 às 20:00)
                </span>
                {lead.data ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {availableHours.map((hr) => {
                      const isSelected = lead.horario === hr;
                      return (
                        <button
                          key={hr}
                          type="button"
                          onClick={() => setLead((prev) => ({ ...prev, horario: hr }))}
                          className={`min-h-[44px] flex items-center justify-center rounded-xl border py-2 text-center text-xs sm:text-sm font-semibold transition-all ${
                            isSelected
                              ? "btn-gold !py-2 !shadow-none !border-transparent"
                              : "border-white/[0.08] bg-[#141618] text-[#d8d3cb] hover:border-[#c7a06b]/40 hover:text-white"
                          }`}
                        >
                          {hr}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#8d8880] italic">
                    Escolha um dia acima para visualizar os horários disponíveis.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-2 text-xs font-semibold text-[#8d8880] hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!lead.data || !lead.horario}
                  className="btn-gold !py-2.5 !px-5 !text-xs disabled:opacity-40 disabled:pointer-events-none"
                >
                  Continuar
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Contato */}
          {currentStepId === "dados" && (
            <form onSubmit={handleSubmit} className="animate-fade-in space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white sm:text-2xl">
                  Para fechar, seus dados.
                </h3>
                <p className="mt-1 text-sm text-[#a8a39b]">
                  É com eles que enviamos o link da sala de vídeo e o convite da reunião.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor={nameId} className="block text-[11px] font-bold uppercase tracking-wider text-[#8d8880]">
                  Nome completo
                </label>
                <input
                  id={nameId}
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={lead.nome}
                  onChange={(e) => setLead((prev) => ({ ...prev, nome: e.target.value }))}
                  className="w-full min-h-[46px] rounded-xl border border-white/[0.12] bg-[#141618] px-3.5 py-2.5 sm:px-4 text-base sm:text-sm text-white placeholder:text-[#6d6961] focus:border-[#c7a06b] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor={emailId} className="block text-[11px] font-bold uppercase tracking-wider text-[#8d8880]">
                  E-mail corporativo
                </label>
                <input
                  id={emailId}
                  type="email"
                  required
                  placeholder="voce@suaagencia.com.br"
                  value={lead.email}
                  onChange={(e) => setLead((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full min-h-[46px] rounded-xl border border-white/[0.12] bg-[#141618] px-3.5 py-2.5 sm:px-4 text-base sm:text-sm text-white placeholder:text-[#6d6961] focus:border-[#c7a06b] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor={phoneId} className="block text-[11px] font-bold uppercase tracking-wider text-[#8d8880]">
                  WhatsApp com DDD
                </label>
                <input
                  id={phoneId}
                  type="tel"
                  required
                  placeholder="(11) 99999-9999"
                  value={lead.whatsapp}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full min-h-[46px] rounded-xl border border-white/[0.12] bg-[#141618] px-3.5 py-2.5 sm:px-4 text-base sm:text-sm text-white placeholder:text-[#6d6961] focus:border-[#c7a06b] focus:outline-none"
                />
              </div>

              <div className="pt-1">
                <label htmlFor={consentId} className="flex items-start gap-2.5 text-xs text-[#a8a39b] cursor-pointer">
                  <input
                    id={consentId}
                    type="checkbox"
                    checked={lead.consent}
                    onChange={(e) => setLead((prev) => ({ ...prev, consent: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-[#141618] text-[#c7a06b] focus:ring-0"
                  />
                  <span>
                    Autorizo a Destraflow Tech a usar meus dados de contato exclusivamente para agendar e confirmar esta vídeo conferência.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex items-center gap-2 text-xs font-semibold text-[#8d8880] hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold !py-3 !px-5 sm:!px-6 !text-xs sm:!text-sm"
                >
                  {isSubmitting ? "Agendando..." : "Finalizar e agendar →"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 6: Sucesso */}
          {currentStepId === "sucesso" && (
            <div className="animate-fade-in space-y-5 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30">
                <Check className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white sm:text-2xl">
                  Pré-agendamento registrado!
                </h3>
                <p className="mt-1 text-sm text-[#a8a39b]">
                  Agora toque no botão abaixo para abrir o WhatsApp — o resumo já está pronto para o nosso time confirmar.
                </p>
              </div>

              <div className="rounded-2xl border border-[#c7a06b]/20 bg-[#c7a06b]/[0.08] p-4 text-xs leading-relaxed text-[#d8d3cb] space-y-1">
                <p><b className="text-white">{lead.nome}</b></p>
                <p>Dia e horário: <b className="text-[#e3c79b]">{eventDetails?.humanDateStr} às {lead.horario}</b> (Brasília)</p>
                <p>Duração: 45 minutos, por vídeo conferência</p>
                <p>Perfil da agência: {lead.perfil}</p>
                <p>Tráfego pago: {lead.trafego}</p>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold w-full text-center"
              >
                Abrir WhatsApp e confirmar reunião →
              </a>

              <div className="flex flex-wrap gap-4 pt-1 text-xs">
                {icsDownloadUrl && (
                  <a
                    href={icsDownloadUrl}
                    download="destraflow-reuniao.ics"
                    className="flex items-center gap-1.5 text-[#e3c79b] hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Adicionar à agenda (Zoho, Outlook, Apple)
                  </a>
                )}
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#e3c79b] hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Adicionar ao Google Agenda
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
