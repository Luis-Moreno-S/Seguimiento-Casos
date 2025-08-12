import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-botones',
  imports: [CommonModule],
  templateUrl: './botones.html',
  styleUrl: './botones.css'
})
export class BotonesComponent {
  count: number = 1;
  text: string = "";
  disabled: boolean = false;

  increment() {
    this.count += 1;
  }

  decrement() {
    this.count--;
  }
}