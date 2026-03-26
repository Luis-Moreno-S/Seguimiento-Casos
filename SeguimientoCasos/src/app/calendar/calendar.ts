import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CalendarModel } from '../../interface/model';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ParticipantListComponent } from '../shared/participant-list/participant-list';
import { NgxPaginationModule } from 'ngx-pagination';
import { DashboardComponent } from '../dashboard/dashboard.component';

@Component({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ParticipantListComponent, NgxPaginationModule, DashboardComponent],
  selector: 'app-calendar',
  styleUrl: './calendar.css',
  templateUrl: './calendar.html',
})

export class CalendarComponent implements OnInit {
  dataForm!: FormGroup;
  events: CalendarModel[] = [];
  aiAnalysisHtml = '';
  spinnerTable = false;
  spinnerWidgets = false;
  loadingEvents = false;
  widgetsAnalysisLoaded = false;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' | '' = '';
  reunionesRealizadas = 0;
  reunionesCanceladas = 0;
  readonly departments = Object.keys(USERS_BY_DEPARTMENT);
  usersForSelectedDepartment: Array<{ email: string; displayName: string }> = [];
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  sortColumn: keyof CalendarModel | 'Participants' | 'StartDate' | 'StartTime' | 'EndTime' = 'StartDateTime';
  sortDirection: 'asc' | 'desc' = 'desc';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Parametros
    this.dataForm = this.fb.group({
      department: ['IT', Validators.required],
      includeIssatec: [true],
      end: [formatDate(new Date()), Validators.required],
      start: [formatDate(new Date()), Validators.required],
      userEmail: ['luis.moreno@issatec.com', Validators.required]
    });
    this.updateUsersByDepartment('IT');
    this.dataForm.get('department')?.valueChanges.subscribe((department) => {
      this.updateUsersByDepartment(department ?? '');
    });

    //Tabla + Analisis IA
    this.getData();

  }

  getData(): void {
    if (this.loadingEvents) {
      return;
    }

    if (this.dataForm.invalid) {
      this.loadingEvents = false;
      this.spinnerTable = false;
      this.spinnerWidgets = false;
      this.feedbackType = 'error';
      this.feedbackMessage = 'Completa los campos requeridos antes de consultar.';
      this.dataForm.markAllAsTouched();
      this.cd.detectChanges();
      return;
    }

    const startDate = new Date(this.dataForm.value.start);
    const endDate = new Date(this.dataForm.value.end);
    if (startDate > endDate) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'La fecha inicial no puede ser mayor a la fecha final.';
      return;
    }

    this.loadingEvents = true;
    this.spinnerTable = true;
    this.spinnerWidgets = true;
    this.widgetsAnalysisLoaded = false;
    this.feedbackMessage = '';
    this.feedbackType = '';
    this.reunionesRealizadas = 0;
    this.reunionesCanceladas = 0;
    this.aiAnalysisHtml = '';
    this.setInnerHtmlById("WidgetsAnalysisContent", '');
    this.cd.detectChanges();
    let canceladas = 0;
    let completadas = 0;
    this.http.get<CalendarModel[]>(
      `https://localhost:44307/api/Values/GetCalendars/${this.dataForm.value.userEmail}/${this.dataForm.value.start}/${this.dataForm.value.end}`
    ).subscribe({
      next: (data) => {
        if (!this.dataForm.value.includeIssatec) {
          data = data.filter(ev => ev.Customer?.trim().toLowerCase() !== "issatec");
        }
        this.events = data.sort(
          (a, b) =>
            new Date(b.StartDateTime).getTime() - new Date(a.StartDateTime).getTime()
        );

        // Resumen de cumplimiento para feedback
        this.events.forEach(ev => {
          completadas += ev.Estado?.toLowerCase() === "realizada" ? 1 : 0;
          canceladas += ev.Estado?.toLowerCase() === "cancelada" ? 1 : 0;
        });

        // Table IA
        this.http.post<string>(
          'https://localhost:44307/api/Values/GetAnalysisTable',
          this.events,
          { responseType: 'text' as 'json' }
        ).subscribe({
          next: (resp) => {
            try {
              const clean = resp
                .replace(/```html/g, "")
                .replace(/```/g, "")
                .replace(/\n/g, "")
                .replace(/^"(.*)"$/, "$1")
                .trim();
              this.aiAnalysisHtml = clean;
            } catch {
              this.aiAnalysisHtml = '<p class="feedback-message feedback-error">No se pudo procesar el analisis IA.</p>';
            } finally {
              this.spinnerTable = false;
            }
            this.cd.detectChanges();
          },
          error: () => {
            this.spinnerTable = false;
            this.aiAnalysisHtml = '<p class="feedback-message feedback-error">No se pudo cargar el analisis IA.</p>';
            this.cd.detectChanges();
          }
        });

        // Widgets IA
        this.http.post<string>(
          'https://localhost:44307/api/Values/GetAnalysisWidgets',
          this.events,
          { responseType: 'text' as 'json' }
        ).subscribe({
          next: (resp) => {
            try {
              const clean = resp
                .replace(/```html/g, "")
                .replace(/```/g, "")
                .replace(/\n/g, "")
                .replace(/^"(.*)"$/, "$1")
                .trim();
              this.renderWidgetsMarkup(clean);
              this.widgetsAnalysisLoaded = true;
            } catch {
              this.setInnerHtmlById("WidgetsAnalysisContent", '<p class="feedback-message feedback-error">No se pudo procesar el análisis de widgets.</p>');
              this.widgetsAnalysisLoaded = false;
            } finally {
              this.spinnerWidgets = false;
            }
            this.cd.detectChanges();
          },
          error: () => {
            this.spinnerWidgets = false;
            this.widgetsAnalysisLoaded = false;
            this.setInnerHtmlById("WidgetsAnalysisContent", '<p class="feedback-message feedback-error">No se pudo cargar el análisis de widgets.</p>');
            this.cd.detectChanges();
          }
        });
        this.loadingEvents = false;
        this.currentPage = 1;
        this.feedbackType = 'success';
        this.reunionesRealizadas = completadas;
        this.reunionesCanceladas = canceladas;
        this.feedbackMessage = `Se cargaron ${this.events.length} reuniones correctamente.`;
        this.cd.detectChanges();
      },
      error: (ex) => {
        this.loadingEvents = false;
        this.spinnerTable = false;
        this.spinnerWidgets = false;
        this.widgetsAnalysisLoaded = false;
        this.feedbackType = 'error';
        this.feedbackMessage = 'Ocurrió un error consultando el servicio. Intenta nuevamente.';
        this.aiAnalysisHtml = '';
        this.setInnerHtmlById("WidgetsAnalysisContent", '');
        this.cd.detectChanges();
        console.error('Error cargando eventos', ex);
      },
    });
  }

  private renderWidgetsMarkup(markup: string): void {
    const container = document.getElementById("WidgetsAnalysisContent");
    if (!container) {
      return;
    }

    const temp = document.createElement('div');
    temp.innerHTML = markup;

    let widgets = Array.from(temp.querySelectorAll('.card, .section-card')) as HTMLElement[];

    if (widgets.length < 2) {
      widgets = Array.from(temp.children)
        .filter((el): el is HTMLElement => el instanceof HTMLElement);
    }

    if (widgets.length === 1) {
      const nestedChildren = Array.from(widgets[0].children)
        .filter((el): el is HTMLElement => el instanceof HTMLElement);
      if (nestedChildren.length > 1) {
        widgets = nestedChildren;
      }
    }

    if (widgets.length === 0) {
      container.innerHTML = markup;
      return;
    }

    const fragment = document.createDocumentFragment();
    widgets.forEach((widget) => {
      this.stripInlineLayoutStyles(widget);
      const wrapper = document.createElement('div');
      wrapper.className = 'widget-item';
      wrapper.appendChild(widget);
      fragment.appendChild(wrapper);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
  }

  private stripInlineLayoutStyles(element: HTMLElement): void {
    const nodes = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
    nodes.forEach((node) => {
      node.style.removeProperty('width');
      node.style.removeProperty('max-width');
      node.style.removeProperty('min-width');
      node.style.removeProperty('flex');
      node.style.removeProperty('flex-basis');
      node.style.removeProperty('margin-left');
      node.style.removeProperty('margin-right');
    });
  }

  private setInnerHtmlById(id: string, html: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = html;
    }
  }

  private updateUsersByDepartment(department: string): void {
    const control = this.dataForm.get('userEmail');
    const emails = USERS_BY_DEPARTMENT[department] ?? [];

    this.usersForSelectedDepartment = emails
      .map(email => ({ email, displayName: formatNameFromEmail(email) }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    if (!emails.length) {
      control?.setValue('');
      control?.disable({ emitEvent: false });
      return;
    }

    control?.enable({ emitEvent: false });
    const currentEmail = control?.value;
    if (!currentEmail || !emails.includes(currentEmail)) {
      control?.setValue(emails[0], { emitEvent: false });
    }
  }

  get filteredEvents(): CalendarModel[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.sortedEvents(this.events);
    }

    const filtered = this.events.filter((event) => {
      const participantsText = (event.Participants ?? [])
        .map((p) => `${p.Name} ${p.Email} ${p.Type}`)
        .join(' ')
        .toLowerCase();

      const haystack = [
        event.Subject,
        event.Customer,
        event.Estado,
        event.StartDateTime,
        event.EndDateTime,
        String(event.Duration),
        participantsText
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });

    return this.sortedEvents(filtered);
  }

  setSort(column: keyof CalendarModel | 'Participants' | 'StartDate' | 'StartTime' | 'EndTime'): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = column === 'StartDate' ? 'desc' : 'asc';
    }
    this.currentPage = 1;
  }

  getSortIndicator(column: keyof CalendarModel | 'Participants' | 'StartDate' | 'StartTime' | 'EndTime'): string {
    if (this.sortColumn !== column) {
      return '';
    }
    return this.sortDirection === 'asc' ? '▲' : '▼';
  }

  private sortedEvents(list: CalendarModel[]): CalendarModel[] {
    const direction = this.sortDirection === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const aValue = this.getSortableValue(a, this.sortColumn);
      const bValue = this.getSortableValue(b, this.sortColumn);
      if (aValue < bValue) {
        return -1 * direction;
      }
      if (aValue > bValue) {
        return 1 * direction;
      }
      return 0;
    });
  }

  private getSortableValue(event: CalendarModel, column: keyof CalendarModel | 'Participants' | 'StartDate' | 'StartTime' | 'EndTime'): string | number {
    if (column === 'Duration') {
      return event.Duration ?? 0;
    }
    if (column === 'StartDateTime' || column === 'EndDateTime') {
      return new Date((event as any)[column]).getTime();
    }
    if (column === 'StartDate') {
      const d = new Date(event.StartDateTime);
      if (Number.isNaN(d.getTime())) return 0;
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    if (column === 'StartTime') {
      const d = new Date(event.StartDateTime);
      if (Number.isNaN(d.getTime())) return 0;
      return d.getHours() * 60 + d.getMinutes();
    }
    if (column === 'EndTime') {
      const d = new Date(event.EndDateTime);
      if (Number.isNaN(d.getTime())) return 0;
      return d.getHours() * 60 + d.getMinutes();
    }
    if (column === 'Participants') {
      return (event.Participants ?? []).length;
    }
    return (event as any)[column]?.toString()?.toLowerCase?.() ?? '';
  }

}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? '';
  return localPart
    .split('.')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const USERS_BY_DEPARTMENT: Record<string, string[]> = {
  IT: [
    'camilo.vergara@issatec.com',
    'daniel.parra@issatec.com',
    'gustavo.causil@issatec.com',
    'camila.martinez@issatec.com',
    'geoffrey.soto@issatec.com',
    'samuel.melo@issatec.com',
    'luis.moreno@issatec.com'
  ],
  Operaciones: [
    'carol.diaz@issatec.com',
    'isabel.ramirez@issatec.com'
  ],
  Comercial: [
    'angela.galeano@issatec.com',
    'aura.diaz@issatec.com',
    'carlos.burgos@issatec.com',
    'diego.orjuela@issatec.com',
    'sebastian.hernandez@issatec.com'
  ],
  Soporte: [
    'darlein.duran@issatec.com',
    'jonathan.lopez@issatec.com',
    'kevin.pachon@issatec.com',
    'slamlly.avendano@issatec.com',
    'vanesa.moyano@issatec.com'
  ],
  'Estudio grafico': [
    'karen.aguilar@issatec.com',
    'yary.galindo@issatec.com'
  ],
  Proyectos: [
    'sebastian.silva@issatec.com'
  ]
};
