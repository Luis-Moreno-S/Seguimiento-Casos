import { Chart } from 'chart.js/auto';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CalendarModel } from '../../interface/model';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-calendar',
  styleUrl: './calendar.css',
  templateUrl: './calendar.html',
})

export class CalendarComponent implements OnInit {
  chartLine!: Chart;
  dataForm!: FormGroup;
  chartDoughnut!: Chart;
  events: CalendarModel[] = [];
  spinnerTable!: boolean;
  spinnerWidgets!: boolean;
  resumen: Record<string, { count: number; totalDuration: number }> = {};

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Parametros
    this.dataForm = this.fb.group({
      includeIssatec: [true],
      end: [formatDate(new Date())],
      start: [formatDate(new Date())],
      userEmail: ['luis.moreno@issatec.com']
    });

    //Tabla + Analisis IA
    this.getData();

    // Chart Bar + line
    this.chartLine = new Chart("chartLine", {
      type: 'scatter',
      data: this.getDataChartLine()
    });

    // Chart Doughnut
    this.chartDoughnut = new Chart("chartDoughnut", {
      type: 'doughnut',
      data: this.getDataChartDoughnut()
    });
  }

  getData(): void {
    this.resumen = {};
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

        // Agrupar ChartsLine
        this.events.forEach(ev => {
          const cliente = ev.Customer?.trim() || "Sin Cliente";
          if (!this.resumen[cliente]) {
            this.resumen[cliente] = { count: 0, totalDuration: 0 };
          }
          this.resumen[cliente].count += 1;
          this.resumen[cliente].totalDuration += (ev.Duration) ? ev.Duration / 60 : 0;
        });
        this.chartLine.data = this.getDataChartLine();
        this.chartLine.update();

        // Agrupar ChartDoughnut
        this.events.forEach(ev => {
          completadas += ev.Estado?.toLowerCase() === "realizada" ? 1 : 0;
          canceladas += ev.Estado?.toLowerCase() === "cancelada" ? 1 : 0;
        });
        this.chartDoughnut.data = this.getDataChartDoughnut(completadas, canceladas);
        this.chartDoughnut.update();

        // Table IA
        this.spinnerTable = true;
        this.http.post<string>(
          'https://localhost:44307/api/Values/GetAnalysisTable',
          this.events,
          { responseType: 'text' as 'json' }
        ).subscribe({
          next: (resp) => {
            let clean = resp
              .replace(/```html/g, "")
              .replace(/```/g, "")
              .replace(/\n/g, "")
              .replace(/^"(.*)"$/, "$1")
              .trim();
            this.spinnerTable = false;
            document.getElementById("TableAnalysis")!.innerHTML = clean;
          }
        });

        // Widgets IA
        this.spinnerWidgets = true;
        this.http.post<string>(
          'https://localhost:44307/api/Values/GetAnalysisWidgets',
          this.events,
          { responseType: 'text' as 'json' }
        ).subscribe({
          next: (resp) => {
            let clean = resp
              .replace(/```html/g, "")
              .replace(/```/g, "")
              .replace(/\n/g, "")
              .replace(/^"(.*)"$/, "$1")
              .trim();
            this.spinnerWidgets = false;
            document.getElementById("WidgetsAnalysis")!.innerHTML = clean;
          }
        });
        this.cd.detectChanges();
      },
      error: (ex) => {
        console.error('Error cargando eventos', ex);
      },
    });
  }

  getDataChartDoughnut(completadas: number = 0, canceladas: number = 0): any {
    return {
      labels: ["Completados", "Canceladas"],
      datasets: [{
        data: [completadas, canceladas],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }]
    };
  }

  getDataChartLine(): any {
    const labels = Object.keys(this.resumen);
    const counts = labels.map(l => this.resumen[l].count);
    const durations = labels.map(l => this.resumen[l].totalDuration);

    console.log(labels);
    console.log(counts);
    console.log(durations);
    return {
      labels: labels,
      datasets: [{
        label: "Cantidad de reuniones",
        type: 'bar',
        data: counts,
        fill: false,
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(255, 159, 64, 0.2)',
          'rgba(255, 205, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(255, 159, 64)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)'
        ],
        borderWidth: 1
      }, {
        type: 'line',
        label: 'Duración',
        data: durations,
        fill: false,
        borderColor: 'rgb(54, 162, 235)'
      }]
    };
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
