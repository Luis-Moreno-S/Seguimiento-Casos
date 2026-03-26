import { Component } from '@angular/core';
import { CalendarComponent } from './calendar/calendar';

@Component({
  selector: 'app-root',
  imports: [CalendarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})

export class App {
  title: string = "Seguimiento de casos";

  isDarkMode = false;

  ngOnInit(): void {
    const storedPreference = localStorage.getItem('theme-preference');
    this.isDarkMode = storedPreference
      ? storedPreference === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme();
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    localStorage.setItem('theme-preference', this.isDarkMode ? 'dark' : 'light');
  }

  private applyTheme(): void {
    document.body.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
  }
}