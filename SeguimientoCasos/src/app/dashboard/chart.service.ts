import { Injectable } from '@angular/core';
import { CalendarModel } from '../../interface/model';

export interface DashboardKpi {
  totalMeetings: number;
  averageDuration: number;
  totalParticipants: number;
  overbookings: number;
  busiestDayLabel: string;
}

export interface OverbookingConflict {
  participantName: string;
  participantEmail: string;
  meetingA: string;
  meetingB: string;
  startA: string;
  endA: string;
  startB: string;
  endB: string;
  overlapMinutes: number;
}

export interface DashboardAnalytics {
  meetingsByDay: { labels: string[]; values: number[] };
  meetingsByHour: { labels: string[]; values: number[] };
  durationBuckets: { labels: string[]; values: number[] };
  topParticipants: { labels: string[]; values: number[] };
  customerSummary: { labels: string[]; meetings: number[]; durationHours: number[] };
  compliance: { completed: number; canceled: number };
  overbookings: OverbookingConflict[];
  kpi: DashboardKpi;
}

interface PreparedEvent {
  subject: string;
  start: Date;
  end: Date;
  durationMinutes: number;
  participants: Array<{ email: string; name: string }>;
}

@Injectable({
  providedIn: 'root'
})
export class ChartService {
  private cacheKey = '';
  private cachedResult: DashboardAnalytics | null = null;

  buildAnalytics(events: CalendarModel[]): DashboardAnalytics {
    const key = this.createCacheKey(events);
    if (this.cachedResult && key === this.cacheKey) {
      return this.cachedResult;
    }

    const prepared = events
      .map((event) => this.prepareEvent(event))
      .filter((event): event is PreparedEvent => event !== null);

    const meetingsByDay = this.aggregateMeetingsByDay(prepared);
    const meetingsByHour = this.aggregateMeetingsByHour(prepared);
    const durationBuckets = this.aggregateDurationBuckets(prepared);
    const topParticipants = this.aggregateTopParticipants(prepared);
    const customerSummary = this.aggregateCustomerSummary(events);
    const compliance = this.aggregateCompliance(events);
    const overbookings = this.detectOverbookings(prepared);
    const kpi = this.buildKpis(prepared, overbookings, meetingsByDay);

    const analytics: DashboardAnalytics = {
      meetingsByDay,
      meetingsByHour,
      durationBuckets,
      topParticipants,
      customerSummary,
      compliance,
      overbookings,
      kpi
    };

    this.cacheKey = key;
    this.cachedResult = analytics;
    return analytics;
  }

  private prepareEvent(event: CalendarModel): PreparedEvent | null {
    const start = new Date(event.StartDateTime);
    const end = new Date(event.EndDateTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return null;
    }

    const uniqueParticipants = new Map<string, { email: string; name: string }>();
    (event.Participants ?? []).forEach((participant) => {
      const email = (participant.Email ?? '').trim().toLowerCase();
      if (!email) {
        return;
      }
      uniqueParticipants.set(email, {
        email,
        name: participant.Name?.trim() || email
      });
    });

    const rawDuration = Number(event.Duration);
    const durationMinutes = Number.isFinite(rawDuration) && rawDuration > 0
      ? rawDuration
      : Math.round((end.getTime() - start.getTime()) / 60000);

    return {
      subject: event.Subject?.trim() || 'Sin asunto',
      start,
      end,
      durationMinutes,
      participants: Array.from(uniqueParticipants.values())
    };
  }

  private aggregateMeetingsByDay(events: PreparedEvent[]): { labels: string[]; values: number[] } {
    const counter = new Map<string, number>();
    events.forEach((event) => {
      const key = event.start.toISOString().split('T')[0];
      counter.set(key, (counter.get(key) ?? 0) + 1);
    });

    const entries = Array.from(counter.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      labels: entries.map(([date]) => this.formatDateLabel(date)),
      values: entries.map(([, count]) => count)
    };
  }

  private aggregateMeetingsByHour(events: PreparedEvent[]): { labels: string[]; values: number[] } {
    const hours = Array.from({ length: 11 }, (_, index) => index + 8);
    const counter = new Map<number, number>(hours.map((hour) => [hour, 0]));

    events.forEach((event) => {
      const hour = event.start.getHours();
      if (hour >= 8 && hour <= 18) {
        counter.set(hour, (counter.get(hour) ?? 0) + 1);
      }
    });

    return {
      labels: hours.map((hour) => `${hour}:00`),
      values: hours.map((hour) => counter.get(hour) ?? 0)
    };
  }

  private aggregateDurationBuckets(events: PreparedEvent[]): { labels: string[]; values: number[] } {
    const buckets = [0, 0, 0];
    events.forEach((event) => {
      if (event.durationMinutes <= 30) {
        buckets[0] += 1;
      } else if (event.durationMinutes <= 60) {
        buckets[1] += 1;
      } else {
        buckets[2] += 1;
      }
    });

    return {
      labels: ['0-30 min', '30-60 min', '60+ min'],
      values: buckets
    };
  }

  private aggregateTopParticipants(events: PreparedEvent[]): { labels: string[]; values: number[] } {
    const counter = new Map<string, { name: string; meetings: number }>();
    events.forEach((event) => {
      event.participants.forEach((participant) => {
        const current = counter.get(participant.email);
        if (current) {
          current.meetings += 1;
        } else {
          counter.set(participant.email, { name: participant.name, meetings: 1 });
        }
      });
    });

    const top = Array.from(counter.values())
      .sort((a, b) => b.meetings - a.meetings)
      .slice(0, 10);

    return {
      labels: top.map((participant) => participant.name),
      values: top.map((participant) => participant.meetings)
    };
  }

  private aggregateCustomerSummary(events: CalendarModel[]): { labels: string[]; meetings: number[]; durationHours: number[] } {
    const summary = new Map<string, { meetings: number; durationHours: number }>();
    events.forEach((event) => {
      const customer = event.Customer?.trim() || 'Sin Cliente';
      const current = summary.get(customer) ?? { meetings: 0, durationHours: 0 };
      current.meetings += 1;
      current.durationHours += event.Duration ? event.Duration / 60 : 0;
      summary.set(customer, current);
    });

    const entries = Array.from(summary.entries())
      .sort((a, b) => b[1].meetings - a[1].meetings)
      .slice(0, 10);

    return {
      labels: entries.map(([customer]) => customer),
      meetings: entries.map(([, data]) => data.meetings),
      durationHours: entries.map(([, data]) => Number(data.durationHours.toFixed(2)))
    };
  }

  private aggregateCompliance(events: CalendarModel[]): { completed: number; canceled: number } {
    let completed = 0;
    let canceled = 0;
    events.forEach((event) => {
      const status = event.Estado?.trim().toLowerCase();
      completed += status === 'realizada' ? 1 : 0;
      canceled += status === 'cancelada' ? 1 : 0;
    });
    return { completed, canceled };
  }

  private detectOverbookings(events: PreparedEvent[]): OverbookingConflict[] {
    const byParticipant = new Map<string, { name: string; meetings: PreparedEvent[] }>();
    events.forEach((event) => {
      event.participants.forEach((participant) => {
        const current = byParticipant.get(participant.email);
        if (current) {
          current.meetings.push(event);
        } else {
          byParticipant.set(participant.email, { name: participant.name, meetings: [event] });
        }
      });
    });

    const conflicts: OverbookingConflict[] = [];
    const seen = new Set<string>();

    byParticipant.forEach((data, email) => {
      const meetings = [...data.meetings].sort((a, b) => a.start.getTime() - b.start.getTime());
      for (let i = 0; i < meetings.length - 1; i += 1) {
        const current = meetings[i];
        for (let j = i + 1; j < meetings.length; j += 1) {
          const next = meetings[j];
          if (next.start >= current.end) {
            break;
          }
          const overlapMillis = Math.min(current.end.getTime(), next.end.getTime()) - Math.max(current.start.getTime(), next.start.getTime());
          if (overlapMillis <= 0) {
            continue;
          }
          const key = `${email}|${current.start.toISOString()}|${next.start.toISOString()}|${current.subject}|${next.subject}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          conflicts.push({
            participantName: data.name,
            participantEmail: email,
            meetingA: current.subject,
            meetingB: next.subject,
            startA: current.start.toISOString(),
            endA: current.end.toISOString(),
            startB: next.start.toISOString(),
            endB: next.end.toISOString(),
            overlapMinutes: Math.round(overlapMillis / 60000)
          });
        }
      }
    });

    return conflicts.sort((a, b) => new Date(a.startA).getTime() - new Date(b.startA).getTime());
  }

  private buildKpis(
    events: PreparedEvent[],
    overbookings: OverbookingConflict[],
    meetingsByDay: { labels: string[]; values: number[] }
  ): DashboardKpi {
    const totalMeetings = events.length;
    const totalDuration = events.reduce((acc, event) => acc + event.durationMinutes, 0);
    const totalParticipants = events.reduce((acc, event) => acc + event.participants.length, 0);
    const averageDuration = totalMeetings ? Math.round(totalDuration / totalMeetings) : 0;

    let busiestDayLabel = 'Sin datos';
    if (meetingsByDay.values.length) {
      const maxValue = Math.max(...meetingsByDay.values);
      const index = meetingsByDay.values.findIndex((value) => value === maxValue);
      const label = meetingsByDay.labels[index];
      busiestDayLabel = `${label} (${maxValue})`;
    }

    return {
      totalMeetings,
      averageDuration,
      totalParticipants,
      overbookings: overbookings.length,
      busiestDayLabel
    };
  }

  private createCacheKey(events: CalendarModel[]): string {
    const parts = events.map((event) => [
      event.Subject,
      event.StartDateTime,
      event.EndDateTime,
      event.Duration,
      (event.Participants ?? []).length
    ].join('|'));
    return `${events.length}::${parts.join('||')}`;
  }

  private formatDateLabel(dateIso: string): string {
    const [year, month, day] = dateIso.split('-').map(Number);
    const date = new Date(year, (month ?? 1) - 1, day ?? 1);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short'
    }).format(date);
  }
}
