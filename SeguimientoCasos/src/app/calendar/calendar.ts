import { CommonModule } from '@angular/common';
import { EventItem } from '../../interface/model';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';

@Component({
  imports: [CommonModule],
  selector: 'app-calendar',
  styleUrl: './calendar.css',
  templateUrl: './calendar.html'
})

export class CalendarComponent implements OnInit {
  loading: boolean = true;
  events: EventItem[] = [];

  constructor(private http: HttpClient, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.http.get<EventItem[]>('https://localhost:44307/api/Values/GetAccessToken')
      .subscribe({
        next: (data) => {
          this.events = data.sort((a, b) =>
            new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime()
          );
          this.loading = false;
          this.cd.detectChanges();
        },
        error: (ex) => {
          this.loading = false;
          console.error('Error cargando eventos', ex);
        }
      });
  }
}