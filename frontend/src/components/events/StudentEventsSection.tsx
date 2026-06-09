import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  deleteStudentEventRequest,
  getPromotionDashboardRequest,
  listStudentEventsRequest,
  upsertStudentEventRequest,
  type PromotionDashboardPayload,
  type StudentEventConfig,
} from '@/services/api';

type Feedback = { type: '' | 'success' | 'error'; message: string };

type StudentEventsSectionProps = {
  promotions: Array<{ id: string; nom: string; annee_arrivee: number; annee_depart: number }>;
  selectedPromoId: string;
  onPromoChange: (promoId: string) => void;
  onFeedback: (feedback: Feedback) => void;
  panelClassName: string;
};

async function extractError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? fallback;
}

function formatDayMonth(day: number, month: number): string {
  const value = new Date(2024, month - 1, day);
  return value.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
}

export function StudentEventsSection({
  promotions,
  selectedPromoId,
  onPromoChange,
  onFeedback,
  panelClassName,
}: StudentEventsSectionProps) {
  const [dashboard, setDashboard] = useState<PromotionDashboardPayload | null>(null);
  const [events, setEvents] = useState<StudentEventConfig[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [eventDay, setEventDay] = useState('');
  const [eventMonth, setEventMonth] = useState('');
  const [title, setTitle] = useState('Croissantage');

  const selectedPromotion = promotions.find((promotion) => promotion.id === selectedPromoId);
  const existingByStudent = useMemo(() => {
    const map = new Map<string, StudentEventConfig>();
    for (const event of events) map.set(event.id_etu, event);
    return map;
  }, [events]);

  const loadData = async () => {
    if (!selectedPromoId) {
      setDashboard(null);
      setEvents([]);
      return;
    }

    const [dashboardResponse, eventsResponse] = await Promise.all([
      getPromotionDashboardRequest(selectedPromoId),
      listStudentEventsRequest(selectedPromoId),
    ]);

    if (!dashboardResponse.ok) {
      setDashboard(null);
      onFeedback({
        type: 'error',
        message: await extractError(dashboardResponse, 'Impossible de charger la promotion.'),
      });
      return;
    }

    setDashboard((await dashboardResponse.json()) as PromotionDashboardPayload);

    if (!eventsResponse.ok) {
      setEvents([]);
      onFeedback({
        type: 'error',
        message: await extractError(eventsResponse, 'Impossible de charger les events.'),
      });
      return;
    }

    setEvents((await eventsResponse.json()) as StudentEventConfig[]);
  };

  useEffect(() => {
    void loadData();
  }, [selectedPromoId]);

  useEffect(() => {
    setSelectedStudentId((prev) =>
      dashboard?.etudiants.some((student) => student.id === prev)
        ? prev
        : (dashboard?.etudiants[0]?.id ?? '')
    );
  }, [dashboard?.etudiants]);

  useEffect(() => {
    const existing = existingByStudent.get(selectedStudentId);
    if (!existing) {
      setEventDay('');
      setEventMonth('');
      setTitle('Croissantage');
      return;
    }

    setEventDay(String(existing.event_day));
    setEventMonth(String(existing.event_month));
    setTitle(existing.title);
  }, [existingByStudent, selectedStudentId]);

  const saveEvent = async () => {
    if (!selectedPromoId || !selectedStudentId || !eventDay || !eventMonth) {
      onFeedback({ type: 'error', message: 'Selectionnez un etudiant et une date.' });
      return;
    }

    const response = await upsertStudentEventRequest(selectedPromoId, {
      id_etu: selectedStudentId,
      event_month: Number(eventMonth),
      event_day: Number(eventDay),
      title: title.trim() || 'Croissantage',
    });

    if (!response.ok) {
      onFeedback({
        type: 'error',
        message: await extractError(response, 'Impossible d enregistrer l event.'),
      });
      return;
    }

    onFeedback({ type: 'success', message: 'Event enregistre.' });
    await loadData();
  };

  const deleteEvent = async (eventId: string) => {
    if (!selectedPromoId) return;
    const response = await deleteStudentEventRequest(selectedPromoId, eventId);
    if (!response.ok) {
      onFeedback({
        type: 'error',
        message: await extractError(response, 'Impossible de supprimer l event.'),
      });
      return;
    }
    onFeedback({ type: 'success', message: 'Event supprime.' });
    await loadData();
  };

  return (
    <section className={panelClassName}>
      <h2 className="text-xl font-semibold text-foreground">Gestion des events</h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <select
          value={selectedPromoId}
          onChange={(event) => onPromoChange(event.target.value)}
          className="h-11 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-foreground"
        >
          <option value="">Selectionner promotion</option>
          {promotions.map((promotion) => (
            <option key={promotion.id} value={promotion.id}>
              {promotion.nom} ({promotion.annee_arrivee}-{promotion.annee_depart})
            </option>
          ))}
        </select>
        <select
          value={selectedStudentId}
          onChange={(event) => setSelectedStudentId(event.target.value)}
          className="h-11 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-foreground"
        >
          <option value="">Selectionner etudiant</option>
          {(dashboard?.etudiants ?? []).map((student) => (
            <option key={student.id} value={student.id}>
              {student.prenom} {student.nom}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Titre"
          className="h-11 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-foreground"
        />
        <select
          value={eventDay}
          onChange={(event) => setEventDay(event.target.value)}
          className="h-11 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-foreground"
        >
          <option value="">Jour</option>
          {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
        <select
          value={eventMonth}
          onChange={(event) => setEventMonth(event.target.value)}
          className="h-11 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-foreground"
        >
          <option value="">Mois</option>
          {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
            <option key={month} value={month}>
              {new Date(2024, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long' })}
            </option>
          ))}
        </select>
        <Button
          type="button"
          className="h-10 rounded-xl bg-[var(--surface-strong)] text-white hover:bg-[var(--surface-strong-hover)] dark:text-zinc-900 lg:col-span-2"
          onClick={() => void saveEvent()}
        >
          Enregistrer croissantage
        </Button>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-sm text-muted-foreground">
          {selectedPromotion
            ? `Croissantages de ${selectedPromotion.nom}`
            : 'Selectionnez une promotion'}
        </p>
        {events.map((event) => (
          <article
            key={event.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">
                {event.student_prenom} {event.student_nom}
              </p>
              <p className="text-xs text-muted-foreground">
                {event.title} - {formatDayMonth(event.event_day, event.event_month)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50"
              onClick={() => void deleteEvent(event.id)}
            >
              Supprimer
            </Button>
          </article>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun croissantage defini.</p>
        )}
      </div>
    </section>
  );
}
