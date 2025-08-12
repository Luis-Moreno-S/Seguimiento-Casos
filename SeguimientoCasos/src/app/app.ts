import { Component, signal } from '@angular/core';
import { ListadoComponent } from './listado/listado';
import { BotonesComponent } from './botones/botones';
import { CalendarComponent } from './calendar/calendar';

@Component({
  selector: 'app-root',
  imports: [ListadoComponent, BotonesComponent, CalendarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})

export class App {
  title: string = "Seguimiento de casos";
}