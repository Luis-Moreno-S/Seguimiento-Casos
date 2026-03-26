import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { CalendarModel } from '../../interface/model';
import { ChartService, DashboardAnalytics, DashboardKpi, OverbookingConflict } from './chart.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnChanges {
  @Input() events: CalendarModel[] = [];
  @Input() loading = false;
  @Input() aiAnalysisHtml = '';
  @Input() aiAnalysisLoading = false;

  kpi: DashboardKpi = {
    totalMeetings: 0,
    averageDuration: 0,
    totalParticipants: 0,
    overbookings: 0,
    busiestDayLabel: 'Sin datos'
  };

  conflictsToShow = 6;
  overbookingConflicts: OverbookingConflict[] = [];

  lineChartType: ChartType = 'line';
  lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };

  hoursChartType: ChartType = 'bar';
  hoursChartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };

  durationChartType: ChartType = 'bar';
  durationChartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };

  topParticipantsChartType: ChartType = 'bar';
  topParticipantsChartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };

  customerMixChartType: ChartType = 'bar';
  customerMixChartData: ChartData<'bar' | 'line'> = {
    labels: [],
    datasets: []
  };

  complianceChartType: ChartType = 'doughnut';
  complianceChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: []
  };

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500
    },
    plugins: {
      legend: {
        labels: {
          color: '#9ca3af'
        }
      },
      tooltip: {
        enabled: true
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#9ca3af'
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.12)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9ca3af',
          precision: 0
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.12)'
        }
      }
    }
  };

  horizontalBarOptions: ChartConfiguration['options'] = {
    ...this.chartOptions,
    indexAxis: 'y'
  };

  doughnutOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#9ca3af'
        }
      },
      tooltip: {
        enabled: true
      }
    }
  };

  constructor(private chartService: ChartService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['events']) {
      this.buildDashboard();
    }
  }

  get visibleConflicts(): OverbookingConflict[] {
    return this.overbookingConflicts.slice(0, this.conflictsToShow);
  }

  get hasMoreConflicts(): boolean {
    return this.overbookingConflicts.length > this.conflictsToShow;
  }

  showMoreConflicts(): void {
    this.conflictsToShow += 6;
  }

  formatConflictDate(dateIso: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateIso));
  }

  private buildDashboard(): void {
    const analytics = this.chartService.buildAnalytics(this.events ?? []);
    this.applyCharts(analytics);
    this.kpi = analytics.kpi;
    this.overbookingConflicts = analytics.overbookings;
    this.conflictsToShow = 6;
  }

  private applyCharts(analytics: DashboardAnalytics): void {
    this.lineChartData = {
      labels: analytics.meetingsByDay.labels,
      datasets: [
        {
          data: analytics.meetingsByDay.values,
          label: 'Reuniones por día',
          borderColor: 'rgba(56, 189, 248, 1)',
          backgroundColor: 'rgba(56, 189, 248, 0.2)',
          fill: true,
          tension: 0.3
        }
      ]
    };

    this.hoursChartData = {
      labels: analytics.meetingsByHour.labels,
      datasets: [
        {
          data: analytics.meetingsByHour.values,
          label: 'Reuniones por hora',
          backgroundColor: 'rgba(139, 92, 246, 0.6)',
          borderColor: 'rgba(139, 92, 246, 1)',
          borderWidth: 1
        }
      ]
    };

    this.durationChartData = {
      labels: analytics.durationBuckets.labels,
      datasets: [
        {
          data: analytics.durationBuckets.values,
          label: 'Distribución de duración',
          backgroundColor: [
            'rgba(59, 130, 246, 0.65)',
            'rgba(16, 185, 129, 0.65)',
            'rgba(245, 158, 11, 0.65)'
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(245, 158, 11, 1)'
          ],
          borderWidth: 1
        }
      ]
    };

    this.topParticipantsChartData = {
      labels: analytics.topParticipants.labels,
      datasets: [
        {
          data: analytics.topParticipants.values,
          label: 'Top participantes',
          backgroundColor: 'rgba(236, 72, 153, 0.55)',
          borderColor: 'rgba(236, 72, 153, 1)',
          borderWidth: 1
        }
      ]
    };

    this.customerMixChartData = {
      labels: analytics.customerSummary.labels,
      datasets: [
        {
          type: 'bar',
          label: 'Cantidad de reuniones',
          data: analytics.customerSummary.meetings,
          backgroundColor: 'rgba(45, 212, 191, 0.55)',
          borderColor: 'rgba(20, 184, 166, 1)',
          borderWidth: 1
        },
        {
          type: 'line',
          label: 'Duración total (horas)',
          data: analytics.customerSummary.durationHours,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          tension: 0.3
        }
      ]
    };

    this.complianceChartData = {
      labels: ['Completadas', 'Canceladas'],
      datasets: [
        {
          data: [analytics.compliance.completed, analytics.compliance.canceled],
          backgroundColor: ['rgba(34, 197, 94, 0.75)', 'rgba(239, 68, 68, 0.72)'],
          borderColor: ['rgba(21, 128, 61, 1)', 'rgba(185, 28, 28, 1)'],
          borderWidth: 1
        }
      ]
    };
  }
}
